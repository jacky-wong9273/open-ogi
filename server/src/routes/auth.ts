import {
  Router,
  type Request,
  type Response,
  type RequestHandler,
} from "express";
import type { AuthService } from "../services/auth.js";
import type { AuditService } from "../services/audit.js";
import type { AuthRateLimiter } from "../middleware/security.js";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "manager", "operator", "viewer"]),
});

export function createAuthRoutes(
  authService: AuthService,
  auditService: AuditService,
  authRateLimiter?: AuthRateLimiter,
  authMiddleware?: RequestHandler,
): Router {
  const router = Router();

  // POST /api/auth/login
  router.post("/login", async (req: Request, res: Response) => {
    try {
      const clientIp = req.ip ?? req.socket.remoteAddress ?? "unknown";

      // Auth-specific rate limiting
      if (authRateLimiter && !authRateLimiter.isAllowed(clientIp)) {
        const remaining = authRateLimiter.getLockoutRemaining(clientIp);
        await auditService.log({
          agentId: "",
          action: "login_rate_limited",
          details: `Rate limited login attempt from ${clientIp}`,
          ipAddress: clientIp,
        });
        res.status(429).json({
          error: "Too many login attempts. Please try again later.",
          retryAfterMs: remaining,
        });
        return;
      }

      const body = loginSchema.parse(req.body);
      const session = await authService.login(body);
      if (!session) {
        authRateLimiter?.recordFailure(clientIp);
        await auditService.log({
          agentId: "",
          action: "login_failed",
          details: `Failed login attempt for user: ${body.username}`,
          ipAddress: clientIp,
        });
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      authRateLimiter?.recordSuccess(clientIp);
      await auditService.log({
        agentId: "",
        userId: session.userId,
        action: "login_success",
        details: `User logged in: ${body.username}`,
        ipAddress: req.ip ?? "",
      });

      res.json(session);
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

  // GET /api/auth/me
  router.get(
    "/me",
    ...(authMiddleware ? [authMiddleware] : []),
    (req: Request, res: Response) => {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      res.json(req.user);
    },
  );

  // POST /api/auth/users (admin only — protected by auth + role check)
  router.post(
    "/users",
    ...(authMiddleware ? [authMiddleware] : []),
    async (req: Request, res: Response) => {
      if (!req.user || req.user.role !== "admin") {
        res.status(403).json({ error: "Admin access required" });
        return;
      }
      try {
        const body = createUserSchema.parse(req.body);
        const user = await authService.createUser(
          body.username,
          body.email,
          body.password,
          body.role,
        );
        await auditService.log({
          agentId: "",
          userId: req.user?.id,
          action: "user_created",
          details: `Created user: ${body.username} with role: ${body.role}`,
          ipAddress: req.ip ?? "",
        });
        res.status(201).json(user);
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

  // GET /api/auth/users (admin only)
  router.get(
    "/users",
    ...(authMiddleware ? [authMiddleware] : []),
    async (req: Request, res: Response) => {
      if (!req.user || req.user.role !== "admin") {
        res.status(403).json({ error: "Admin access required" });
        return;
      }
      const users = await authService.listUsers();
      res.json(users);
    },
  );

  // PATCH /api/auth/users/:id/role (admin only)
  router.patch(
    "/users/:id/role",
    ...(authMiddleware ? [authMiddleware] : []),
    async (req: Request, res: Response) => {
      if (!req.user || req.user.role !== "admin") {
        res.status(403).json({ error: "Admin access required" });
        return;
      }
      const { role } = z
        .object({ role: z.enum(["admin", "manager", "operator", "viewer"]) })
        .parse(req.body);
      await authService.updateUserRole(req.params.id, role);
      await auditService.log({
        agentId: "",
        userId: req.user?.id,
        action: "user_role_updated",
        details: `Updated user ${req.params.id} role to: ${role}`,
        ipAddress: req.ip ?? "",
      });
      res.json({ success: true });
    },
  );

  return router;
}
