import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { SkillLabService } from "../services/skill-lab.js";
import type { AuditService } from "../services/audit.js";
import { requirePermission } from "../middleware/rbac.js";

const createSkillSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().default(""),
  skillMd: z.string(),
  environment: z.string().default("development"),
  isPublic: z.boolean().default(false),
});

export function createSkillRoutes(
  skillLab: SkillLabService,
  auditService: AuditService,
): Router {
  const router = Router();

  router.get(
    "/",
    requirePermission("skill", "read"),
    async (req: Request, res: Response) => {
      const skills = await skillLab.list({
        environment: req.query.environment as string | undefined,
        createdBy: req.user!.role === "admin" ? undefined : req.user!.id,
      });
      res.json(skills);
    },
  );

  router.get(
    "/:id",
    requirePermission("skill", "read"),
    async (req: Request, res: Response) => {
      const skill = await skillLab.getById(req.params.id);
      if (!skill) {
        res.status(404).json({ error: "Skill not found" });
        return;
      }
      res.json(skill);
    },
  );

  router.post(
    "/",
    requirePermission("skill", "create"),
    async (req: Request, res: Response) => {
      try {
        const body = createSkillSchema.parse(req.body);
        const skill = await skillLab.create({
          ...body,
          createdBy: req.user!.id,
        });
        await auditService.log({
          agentId: "",
          userId: req.user!.id,
          action: "skill_invoked",
          details: `Created skill: ${body.name}`,
          resourceType: "skill",
          resourceId: skill.id,
        });
        res.status(201).json(skill);
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
    requirePermission("skill", "update"),
    async (req: Request, res: Response) => {
      try {
        const body = createSkillSchema.partial().parse(req.body);
        const skill = await skillLab.update(req.params.id, body);
        if (!skill) {
          res.status(404).json({ error: "Skill not found" });
          return;
        }
        res.json(skill);
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
    requirePermission("skill", "delete"),
    async (req: Request, res: Response) => {
      const deleted = await skillLab.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Skill not found" });
        return;
      }
      res.json({ success: true });
    },
  );

  router.post(
    "/:id/references",
    requirePermission("skill", "update"),
    async (req: Request, res: Response) => {
      const { filename, content } = z
        .object({ filename: z.string(), content: z.string() })
        .parse(req.body);
      const ref = await skillLab.addReference(req.params.id, filename, content);
      res.status(201).json(ref);
    },
  );

  router.get(
    "/:id/references",
    requirePermission("skill", "read"),
    async (req: Request, res: Response) => {
      const refs = await skillLab.getReferences(req.params.id);
      res.json(refs);
    },
  );

  return router;
}
