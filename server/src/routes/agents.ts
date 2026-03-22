import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { AgentLabService } from "../services/agent-lab.js";
import type { AuditService } from "../services/audit.js";
import { requirePermission } from "../middleware/rbac.js";

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().default(""),
  agentMd: z.string(),
  instructionsMd: z.string(),
  skillsMd: z.string(),
  toolsMd: z.string(),
  styleMd: z.string().optional(),
  permittedSkills: z.array(z.string()).default([]),
  permittedTools: z.array(z.string()).default([]),
  environment: z.string().default("development"),
  isPublic: z.boolean().default(false),
  systemPromptOverride: z.string().optional(),
});

const updateAgentSchema = createAgentSchema.partial();

export function createAgentRoutes(
  agentLab: AgentLabService,
  auditService: AuditService,
): Router {
  const router = Router();

  // GET /api/agents
  router.get(
    "/",
    requirePermission("agent", "read"),
    async (req: Request, res: Response) => {
      const agents = await agentLab.list({
        environment: req.query.environment as string | undefined,
        createdBy: req.user!.role === "admin" ? undefined : req.user!.id,
        isPublic: req.query.isPublic === "true" ? true : undefined,
      });
      res.json(agents);
    },
  );

  // GET /api/agents/:id
  router.get(
    "/:id",
    requirePermission("agent", "read"),
    async (req: Request, res: Response) => {
      const agent = await agentLab.getById(req.params.id);
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      res.json(agent);
    },
  );

  // POST /api/agents
  router.post(
    "/",
    requirePermission("agent", "create"),
    async (req: Request, res: Response) => {
      try {
        const body = createAgentSchema.parse(req.body);
        const agent = await agentLab.create({
          ...body,
          createdBy: req.user!.id,
        });
        await auditService.log({
          agentId: agent.id,
          userId: req.user!.id,
          action: "agent_started",
          details: `Created abstract agent: ${body.name}`,
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

  // PUT /api/agents/:id
  router.put(
    "/:id",
    requirePermission("agent", "update"),
    async (req: Request, res: Response) => {
      try {
        const body = updateAgentSchema.parse(req.body);
        const agent = await agentLab.update(req.params.id, body);
        if (!agent) {
          res.status(404).json({ error: "Agent not found" });
          return;
        }
        await auditService.log({
          agentId: agent.id,
          userId: req.user!.id,
          action: "reference_updated",
          details: `Updated abstract agent: ${agent.name}`,
          resourceType: "agent",
          resourceId: agent.id,
        });
        res.json(agent);
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

  // DELETE /api/agents/:id
  router.delete(
    "/:id",
    requirePermission("agent", "delete"),
    async (req: Request, res: Response) => {
      const deleted = await agentLab.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      await auditService.log({
        agentId: req.params.id,
        userId: req.user!.id,
        action: "agent_stopped",
        details: `Deleted abstract agent: ${req.params.id}`,
        resourceType: "agent",
        resourceId: req.params.id,
      });
      res.json({ success: true });
    },
  );

  // POST /api/agents/:id/references
  router.post(
    "/:id/references",
    requirePermission("agent", "update"),
    async (req: Request, res: Response) => {
      const { filename, content, contextId } = z
        .object({
          filename: z.string(),
          content: z.string(),
          contextId: z.string().default(""),
        })
        .parse(req.body);
      const ref = await agentLab.addReference(
        req.params.id,
        filename,
        content,
        contextId,
      );
      res.status(201).json(ref);
    },
  );

  // GET /api/agents/:id/references
  router.get(
    "/:id/references",
    requirePermission("agent", "read"),
    async (req: Request, res: Response) => {
      const refs = await agentLab.getReferences(req.params.id);
      res.json(refs);
    },
  );

  // GET /api/agents/:id/audit
  router.get(
    "/:id/audit",
    requirePermission("agent", "read"),
    async (req: Request, res: Response) => {
      const audit = await auditService.generateAgentAuditMd(req.params.id);
      res.type("text/markdown").send(audit);
    },
  );

  return router;
}
