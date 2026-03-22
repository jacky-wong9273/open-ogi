import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { Config } from "./config.js";
import type winston from "winston";

// Services
import type { AuthService } from "./services/auth.js";
import type { AgentLabService } from "./services/agent-lab.js";
import type { SkillLabService } from "./services/skill-lab.js";
import type { ToolLabService } from "./services/tool-lab.js";
import type { AuditService } from "./services/audit.js";
import type { TokenTrackerService } from "./services/token-tracker.js";
import type { RealizedAgentService } from "./services/realized-agent.js";
import type { EnvironmentService } from "./services/environment.js";
import type { MessageService } from "./services/message.js";
import { SecurityAuditService } from "./services/security-audit.js";

// Middleware
import { createAuthMiddleware } from "./middleware/auth.js";
import { createAuditMiddleware } from "./middleware/audit.js";
import { requireRole } from "./middleware/rbac.js";
import { correlationMiddleware } from "./middleware/correlation.js";
import { securityHardening, AuthRateLimiter } from "./middleware/security.js";

// Routes
import { createAuthRoutes } from "./routes/auth.js";
import { createAgentRoutes } from "./routes/agents.js";
import { createSkillRoutes } from "./routes/skills.js";
import { createToolRoutes } from "./routes/tools.js";
import { createMonitoringRoutes } from "./routes/monitoring.js";
import { createRealizedAgentRoutes } from "./routes/realized-agents.js";
import { createEnvironmentRoutes } from "./routes/environments.js";
import { createMessageRoutes } from "./routes/messages.js";

export function createApp(deps: {
  config: Config;
  logger: winston.Logger;
  authService: AuthService;
  agentLab: AgentLabService;
  skillLab: SkillLabService;
  toolLab: ToolLabService;
  auditService: AuditService;
  tokenTracker: TokenTrackerService;
  realizedAgentService: RealizedAgentService;
  environmentService: EnvironmentService;
  messageService: MessageService;
}): express.Application {
  const app = express();
  const authRateLimiter = new AuthRateLimiter({
    maxAttempts: deps.config.AUTH_RATE_LIMIT_MAX,
    windowMs: deps.config.AUTH_RATE_LIMIT_WINDOW_MS,
    lockoutMs: deps.config.AUTH_RATE_LIMIT_LOCKOUT_MS,
  });
  const securityAuditService = new SecurityAuditService(deps.config);

  // Correlation ID — first middleware to ensure all logs have it
  app.use(correlationMiddleware());

  // Security middleware
  app.use(helmet());
  app.use(securityHardening(deps.config));
  app.use(cors({ origin: deps.config.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "10mb" }));

  // Rate limiting
  app.use(
    "/api/",
    rateLimit({
      windowMs: deps.config.RATE_LIMIT_WINDOW_MS,
      max: deps.config.RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Health check
  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Auth middleware
  const authMw = createAuthMiddleware(deps.authService);

  // Auth routes (login is public, /me requires auth)
  app.use(
    "/api/auth",
    createAuthRoutes(
      deps.authService,
      deps.auditService,
      authRateLimiter,
      authMw,
    ),
  );

  // Auth middleware for protected routes
  app.use("/api/agents", authMw);
  app.use("/api/skills", authMw);
  app.use("/api/tools", authMw);
  app.use("/api/realized-agents", authMw);
  app.use("/api/environments", authMw);
  app.use("/api/messages", authMw);
  app.use("/api/monitoring", authMw);
  app.use("/api/admin", authMw, requireRole("admin"));

  // Audit middleware for all API calls
  app.use("/api/", createAuditMiddleware(deps.auditService));

  // Resource routes
  app.use("/api/agents", createAgentRoutes(deps.agentLab, deps.auditService));
  app.use("/api/skills", createSkillRoutes(deps.skillLab, deps.auditService));
  app.use("/api/tools", createToolRoutes(deps.toolLab, deps.auditService));
  app.use(
    "/api/realized-agents",
    createRealizedAgentRoutes(deps.realizedAgentService, deps.auditService),
  );
  app.use(
    "/api/environments",
    createEnvironmentRoutes(deps.environmentService, deps.auditService),
  );
  app.use(
    "/api/messages",
    createMessageRoutes(deps.messageService, deps.auditService),
  );
  app.use(
    "/api/monitoring",
    createMonitoringRoutes(deps.tokenTracker, deps.auditService),
  );

  // Admin routes
  app.use("/api/admin", createAdminRoutes(deps, securityAuditService));

  return app;
}

function createAdminRoutes(
  deps: {
    agentLab: AgentLabService;
    skillLab: SkillLabService;
    toolLab: ToolLabService;
    auditService: AuditService;
  },
  securityAuditService: SecurityAuditService,
) {
  const router = express.Router();

  // GET /api/admin/agents — list all agents (admin view)
  router.get("/agents", async (_req, res) => {
    const agents = await deps.agentLab.list();
    res.json(agents);
  });

  // PUT /api/admin/agents/:id/system-prompt — modify default system prompt
  router.put("/agents/:id/system-prompt", async (req, res) => {
    const { systemPromptOverride } = req.body;
    const agent = await deps.agentLab.update(req.params.id, {
      systemPromptOverride,
    });
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    await deps.auditService.log({
      agentId: req.params.id,
      userId: req.user?.id,
      action: "reference_updated",
      details: "System prompt override modified by admin",
    });
    res.json(agent);
  });

  // GET /api/admin/audit — full audit log
  router.get("/audit", async (req, res) => {
    const result = await deps.auditService.getEntries({
      limit: Number(req.query.limit) || 500,
      offset: Number(req.query.offset) || 0,
    });
    res.json(result);
  });

  // GET /api/admin/security-audit — run security config audit
  router.get("/security-audit", (_req, res) => {
    const result = securityAuditService.audit();
    res.json(result);
  });

  // GET /api/admin/security-audit/ready — check production readiness
  router.get("/security-audit/ready", (_req, res) => {
    const ready = securityAuditService.isProductionReady();
    res.json({ productionReady: ready });
  });

  return router;
}
