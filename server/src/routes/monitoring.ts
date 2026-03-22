import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { TokenTrackerService } from "../services/token-tracker.js";
import type { AuditService } from "../services/audit.js";
import { requirePermission } from "../middleware/rbac.js";

export function createMonitoringRoutes(
  tokenTracker: TokenTrackerService,
  auditService: AuditService,
): Router {
  const router = Router();

  // GET /api/monitoring/tokens — token usage report
  router.get(
    "/tokens",
    requirePermission("agent", "read"),
    async (req: Request, res: Response) => {
      const { startDate, endDate } = z
        .object({
          startDate: z
            .string()
            .default(
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            ),
          endDate: z.string().default(new Date().toISOString()),
        })
        .parse(req.query);

      const report = await tokenTracker.getReport(startDate, endDate);
      res.json(report);
    },
  );

  // GET /api/monitoring/tokens/agent/:id — per-agent timeline
  router.get(
    "/tokens/agent/:id",
    requirePermission("agent", "read"),
    async (req: Request, res: Response) => {
      const { startDate, endDate } = z
        .object({
          startDate: z
            .string()
            .default(
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            ),
          endDate: z.string().default(new Date().toISOString()),
        })
        .parse(req.query);

      const timeline = await tokenTracker.getAgentTimeline(
        req.params.id,
        startDate,
        endDate,
      );
      res.json(timeline);
    },
  );

  // POST /api/monitoring/tokens — record token usage (from client)
  router.post("/tokens", async (req: Request, res: Response) => {
    try {
      const body = z
        .object({
          agentId: z.string(),
          skillId: z.string().optional(),
          toolId: z.string().optional(),
          contextId: z.string().default(""),
          inputTokens: z.number().int().min(0),
          outputTokens: z.number().int().min(0),
          model: z.string(),
          provider: z.string(),
          type: z.enum(["agent", "skill", "tool"]),
        })
        .parse(req.body);

      const record = await tokenTracker.record(body);
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: "Validation error", details: err.errors });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/monitoring/audit — audit log
  router.get(
    "/audit",
    requirePermission("agent", "read"),
    async (req: Request, res: Response) => {
      const filters = z
        .object({
          agentId: z.string().optional(),
          action: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(1000).default(100),
          offset: z.coerce.number().int().min(0).default(0),
        })
        .parse(req.query);

      const result = await auditService.getEntries(filters);
      res.json(result);
    },
  );

  return router;
}
