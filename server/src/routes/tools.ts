import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { ToolLabService } from "../services/tool-lab.js";
import type { AuditService } from "../services/audit.js";
import { requirePermission } from "../middleware/rbac.js";

const createToolSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().default(""),
  toolMd: z.string(),
  environment: z.string().default("development"),
  isPublic: z.boolean().default(false),
});

export function createToolRoutes(
  toolLab: ToolLabService,
  auditService: AuditService,
): Router {
  const router = Router();

  router.get(
    "/",
    requirePermission("tool", "read"),
    async (req: Request, res: Response) => {
      const tools = await toolLab.list({
        environment: req.query.environment as string | undefined,
        createdBy: req.user!.role === "admin" ? undefined : req.user!.id,
      });
      res.json(tools);
    },
  );

  router.get(
    "/:id",
    requirePermission("tool", "read"),
    async (req: Request, res: Response) => {
      const tool = await toolLab.getById(req.params.id);
      if (!tool) {
        res.status(404).json({ error: "Tool not found" });
        return;
      }
      res.json(tool);
    },
  );

  router.post(
    "/",
    requirePermission("tool", "create"),
    async (req: Request, res: Response) => {
      try {
        const body = createToolSchema.parse(req.body);
        const tool = await toolLab.create({ ...body, createdBy: req.user!.id });
        await auditService.log({
          agentId: "",
          userId: req.user!.id,
          action: "tool_invoked",
          details: `Created tool: ${body.name}`,
          resourceType: "tool",
          resourceId: tool.id,
        });
        res.status(201).json(tool);
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

  router.put(
    "/:id",
    requirePermission("tool", "update"),
    async (req: Request, res: Response) => {
      try {
        const body = createToolSchema.partial().parse(req.body);
        const tool = await toolLab.update(req.params.id, body);
        if (!tool) {
          res.status(404).json({ error: "Tool not found" });
          return;
        }
        res.json(tool);
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

  router.delete(
    "/:id",
    requirePermission("tool", "delete"),
    async (req: Request, res: Response) => {
      const deleted = await toolLab.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Tool not found" });
        return;
      }
      res.json({ success: true });
    },
  );

  router.post(
    "/:id/scripts",
    requirePermission("tool", "update"),
    async (req: Request, res: Response) => {
      const { filename, content, language } = z
        .object({
          filename: z.string(),
          content: z.string(),
          language: z.string().default("typescript"),
        })
        .parse(req.body);
      const script = await toolLab.addScript(
        req.params.id,
        filename,
        content,
        language,
      );
      res.status(201).json(script);
    },
  );

  router.post(
    "/:id/templates",
    requirePermission("tool", "update"),
    async (req: Request, res: Response) => {
      const { filename, content } = z
        .object({ filename: z.string(), content: z.string() })
        .parse(req.body);
      const template = await toolLab.addTemplate(
        req.params.id,
        filename,
        content,
      );
      res.status(201).json(template);
    },
  );

  return router;
}
