import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { MessageService } from "../services/message.js";
import type { AuditService } from "../services/audit.js";
import { requirePermission } from "../middleware/rbac.js";

const createMessageSchema = z.object({
  contextId: z.string().min(1),
  agentId: z.string().min(1),
  role: z.string().min(1),
  content: z.string().min(1),
  metadata: z.string().optional(),
});

export function createMessageRoutes(
  messageService: MessageService,
  auditService: AuditService,
): Router {
  const router = Router();

  // GET /api/messages/context/:contextId
  router.get(
    "/context/:contextId",
    requirePermission("agent", "read"),
    async (req: Request, res: Response) => {
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined;
      const messages = await messageService.getByContext(
        req.params.contextId,
        limit,
      );
      res.json(messages);
    },
  );

  // GET /api/messages/agent/:agentId
  router.get(
    "/agent/:agentId",
    requirePermission("agent", "read"),
    async (req: Request, res: Response) => {
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined;
      const messages = await messageService.getByAgent(
        req.params.agentId,
        limit,
      );
      res.json(messages);
    },
  );

  // POST /api/messages
  router.post(
    "/",
    requirePermission("agent", "create"),
    async (req: Request, res: Response) => {
      try {
        const body = createMessageSchema.parse(req.body);
        const message = await messageService.create(body);
        await auditService.log({
          agentId: body.agentId,
          userId: req.user!.id,
          action: "message_sent",
          details: `Message created in context ${body.contextId}`,
          contextId: body.contextId,
          resourceType: "agent",
          resourceId: message.id,
        });
        res.status(201).json(message);
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

  // GET /api/messages/:id
  router.get(
    "/:id",
    requirePermission("agent", "read"),
    async (req: Request, res: Response) => {
      const message = await messageService.getById(req.params.id);
      if (!message) {
        res.status(404).json({ error: "Message not found" });
        return;
      }
      res.json(message);
    },
  );

  return router;
}
