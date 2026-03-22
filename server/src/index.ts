import { loadConfig } from "./config.js";
import { initDatabase, closeDatabase } from "./db/index.js";
import { createLogger } from "./services/logger.js";
import { AuthService } from "./services/auth.js";
import { AgentLabService } from "./services/agent-lab.js";
import { SkillLabService } from "./services/skill-lab.js";
import { ToolLabService } from "./services/tool-lab.js";
import { AuditService } from "./services/audit.js";
import { TokenTrackerService } from "./services/token-tracker.js";
import { RealizedAgentService } from "./services/realized-agent.js";
import { EnvironmentService } from "./services/environment.js";
import { MessageService } from "./services/message.js";
import { GatewayServer } from "./ws/gateway.js";
import { createApp } from "./app.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config);

  const db = initDatabase(config.DATABASE_URL);

  logger.info("Open-OGI Server starting...");

  // Initialize services
  const authService = new AuthService(db, config);
  await authService.initialize();

  const agentLab = new AgentLabService(db);
  const skillLab = new SkillLabService(db);
  const toolLab = new ToolLabService(db);
  const auditService = new AuditService(db);
  const tokenTracker = new TokenTrackerService(db);
  const realizedAgentService = new RealizedAgentService(db);
  const environmentService = new EnvironmentService(db);
  const messageService = new MessageService(db);

  // Create Express app
  const app = createApp({
    config,
    logger,
    authService,
    agentLab,
    skillLab,
    toolLab,
    auditService,
    tokenTracker,
    realizedAgentService,
    environmentService,
    messageService,
  });

  // Start HTTP server
  const httpServer = app.listen(config.PORT, () => {
    logger.info(`HTTP server listening on port ${config.PORT}`);
  });

  // Start WebSocket gateway
  const gateway = new GatewayServer(
    config.WS_PORT,
    authService,
    realizedAgentService,
    auditService,
    tokenTracker,
    logger,
  );
  gateway.start();

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    logger.info("Shutting down...");
    httpServer.close();
    gateway.stop();
    closeDatabase();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());

  auditService.log({
    agentId: "",
    action: "server_started",
    details: "Open-OGI Server started",
  });

  logger.info("Open-OGI Server ready");
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
