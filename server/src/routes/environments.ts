import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { EnvironmentService } from "../services/environment.js";
import type { AuditService } from "../services/audit.js";
import { requirePermission } from "../middleware/rbac.js";

const environmentConfigSchema = z.object({
  llmProvider: z.string().default(""),
  llmModel: z.string().default(""),
  llmApiKey: z.string().optional(),
  llmBaseUrl: z.string().optional(),
  maxConcurrentAgents: z.number().int().min(1).default(10),
  maxTokenBudget: z.number().int().min(0).default(1000000),
  systemPromptPrefix: z.string().optional(),
  metadata: z.record(z.string()).default({}),
});

const createEnvironmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().default(""),
  type: z
    .enum(["development", "staging", "production", "custom"])
    .default("development"),
  config: environmentConfigSchema.default({}),
  isActive: z.boolean().default(true),
});

const updateEnvironmentSchema = createEnvironmentSchema.partial();

export function createEnvironmentRoutes(
  envService: EnvironmentService,
  auditService: AuditService,
): Router {
  const router = Router();

  // GET /api/environments
  router.get(
    "/",
    requirePermission("environment", "read"),
    async (req: Request, res: Response) => {
      const environments = await envService.list();
      res.json(environments);
    },
  );

  // GET /api/environments/:id
  router.get(
    "/:id",
    requirePermission("environment", "read"),
    async (req: Request, res: Response) => {
      const environment = await envService.getById(req.params.id);
      if (!environment) {
        res.status(404).json({ error: "Environment not found" });
        return;
      }
      res.json(environment);
    },
  );

  // POST /api/environments
  router.post(
    "/",
    requirePermission("environment", "create"),
    async (req: Request, res: Response) => {
      try {
        const body = createEnvironmentSchema.parse(req.body);
        const environment = await envService.create({
          ...body,
          createdBy: req.user!.id,
        });
        await auditService.log({
          agentId: "",
          userId: req.user!.id,
          action: "environment_created",
          details: `Created environment: ${body.name}`,
          resourceType: "environment",
          resourceId: environment.id,
        });
        res.status(201).json(environment);
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

  // PUT /api/environments/:id
  router.put(
    "/:id",
    requirePermission("environment", "update"),
    async (req: Request, res: Response) => {
      try {
        const body = updateEnvironmentSchema.parse(req.body);
        const environment = await envService.update(req.params.id, body);
        if (!environment) {
          res.status(404).json({ error: "Environment not found" });
          return;
        }
        await auditService.log({
          agentId: "",
          userId: req.user!.id,
          action: "environment_updated",
          details: `Updated environment: ${environment.name}`,
          resourceType: "environment",
          resourceId: environment.id,
        });
        res.json(environment);
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

  // DELETE /api/environments/:id
  router.delete(
    "/:id",
    requirePermission("environment", "delete"),
    async (req: Request, res: Response) => {
      const deleted = await envService.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Environment not found" });
        return;
      }
      await auditService.log({
        agentId: "",
        userId: req.user!.id,
        action: "environment_deleted",
        details: `Deleted environment: ${req.params.id}`,
        resourceType: "environment",
        resourceId: req.params.id,
      });
      res.json({ success: true });
    },
  );

  return router;
}
