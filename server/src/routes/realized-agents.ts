import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { RealizedAgentService } from "../services/realized-agent.js";
import type { AuditService } from "../services/audit.js";
import { requirePermission } from "../middleware/rbac.js";
import { MAX_SUBAGENT_DEPTH } from "@open-ogi/shared";

export function createRealizedAgentRoutes(
  realizedAgentService: RealizedAgentService,
  auditService: AuditService,
): Router {
  const router = Router();

  // GET /api/realized-agents
  router.get(
    "/",
    requirePermission("agent", "read"),
    async (req: Request, res: Response) => {
      const agents = await realizedAgentService.list({
        environment: req.query.environment as string | undefined,
        status: req.query.status as string | undefined,
        clientId: req.query.clientId as string | undefined,
        type: req.query.type as string | undefined,
      });
      res.json(agents);
    },
  );

  // GET /api/realized-agents/:id
  router.get(
    "/:id",
    requirePermission("agent", "read"),
    async (req: Request, res: Response) => {
      const agent = await realizedAgentService.getById(req.params.id);
      if (!agent) {
        res.status(404).json({ error: "Realized agent not found" });
        return;
      }
      res.json(agent);
    },
  );

  // POST /api/realized-agents — instantiate agent
  router.post(
    "/",
    requirePermission("agent", "execute"),
    async (req: Request, res: Response) => {
      try {
        const body = z
          .object({
            abstractAgentId: z.string(),
            name: z.string(),
            type: z.enum(["permanent", "temporary"]),
            parentAgentId: z.string().optional(),
            spawnDepth: z
              .number()
              .int()
              .min(0)
              .max(MAX_SUBAGENT_DEPTH)
              .default(0),
            environment: z.string().default("development"),
            clientId: z.string(),
          })
          .parse(req.body);

        // Enforce max spawn depth
        if (body.spawnDepth > MAX_SUBAGENT_DEPTH) {
          res.status(400).json({
            error: `Maximum spawn depth (${MAX_SUBAGENT_DEPTH}) exceeded`,
          });
          return;
        }

        const agent = await realizedAgentService.instantiate(body);
        await auditService.log({
          agentId: agent.id,
          userId: req.user!.id,
          action: "agent_started",
          details: `Instantiated agent: ${body.name} (${body.type}) from ${body.abstractAgentId}`,
          resourceType: "agent",
          resourceId: agent.id,
        });
        res.status(201).json(agent);
      } catch (err) {
        if (err instanceof z.ZodError) {
          res
            .status(400)
            .json({ error: "Validation error", details: err.errors });
          return;
        }
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // PATCH /api/realized-agents/:id/status
  router.patch(
    "/:id/status",
    requirePermission("agent", "execute"),
    async (req: Request, res: Response) => {
      const { status } = z
        .object({
          status: z.enum(["idle", "running", "waiting", "error", "terminated"]),
        })
        .parse(req.body);

      await realizedAgentService.updateStatus(req.params.id, status);
      await auditService.log({
        agentId: req.params.id,
        userId: req.user!.id,
        action: status === "terminated" ? "agent_stopped" : "agent_started",
        details: `Agent status updated to: ${status}`,
        resourceType: "agent",
        resourceId: req.params.id,
      });
      res.json({ success: true });
    },
  );

  // DELETE /api/realized-agents/:id — terminate
  router.delete(
    "/:id",
    requirePermission("agent", "execute"),
    async (req: Request, res: Response) => {
      await realizedAgentService.terminate(req.params.id);
      await auditService.log({
        agentId: req.params.id,
        userId: req.user!.id,
        action: "agent_stopped",
        details: "Agent terminated",
        resourceType: "agent",
        resourceId: req.params.id,
      });
      res.json({ success: true });
    },
  );

  // GET /api/realized-agents/:id/children
  router.get(
    "/:id/children",
    requirePermission("agent", "read"),
    async (req: Request, res: Response) => {
      const children = await realizedAgentService.getChildAgents(req.params.id);
      res.json(children);
    },
  );

  return router;
}
