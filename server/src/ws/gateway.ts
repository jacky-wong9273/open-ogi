import { WebSocketServer, type WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import type winston from "winston";
import type { AuthService } from "../services/auth.js";
import type { RealizedAgentService } from "../services/realized-agent.js";
import type { AuditService } from "../services/audit.js";
import type { TokenTrackerService } from "../services/token-tracker.js";
import { URL } from "node:url";

interface WsClient {
  ws: WebSocket;
  userId: string;
  clientId: string;
  subscribedAgents: Set<string>;
}

export class GatewayServer {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, WsClient>();

  constructor(
    private port: number,
    private authService: AuthService,
    private realizedAgentService: RealizedAgentService,
    private auditService: AuditService,
    private tokenTracker: TokenTrackerService,
    private logger: winston.Logger,
  ) {}

  start(): void {
    this.wss = new WebSocketServer({ port: this.port });
    this.logger.info(`WebSocket gateway started on port ${this.port}`);

    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });
  }

  stop(): void {
    this.wss?.close();
    this.clients.clear();
  }

  /** Broadcast agent status updates to subscribed clients */
  broadcastAgentUpdate(agentId: string, data: Record<string, unknown>): void {
    for (const client of this.clients.values()) {
      if (
        client.subscribedAgents.has(agentId) ||
        client.subscribedAgents.has("*")
      ) {
        this.send(client.ws, { type: "agent_update", agentId, data });
      }
    }
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    // Authenticate via query string token
    const url = new URL(req.url ?? "", `ws://localhost:${this.port}`);
    const token = url.searchParams.get("token");
    if (!token) {
      ws.close(4001, "Authentication required");
      return;
    }

    const payload = this.authService.verifyToken(token);
    if (!payload) {
      ws.close(4001, "Invalid token");
      return;
    }

    const clientId = url.searchParams.get("clientId") ?? payload.userId;
    const client: WsClient = {
      ws,
      userId: payload.userId,
      clientId,
      subscribedAgents: new Set(),
    };
    this.clients.set(clientId, client);

    this.logger.info(`Client connected: ${clientId}`);

    ws.on("message", (rawData) => {
      try {
        const data = JSON.parse(rawData.toString());
        void this.handleMessage(client, data);
      } catch (err) {
        this.send(ws, { type: "error", message: "Invalid message format" });
      }
    });

    ws.on("close", () => {
      this.clients.delete(clientId);
      this.logger.info(`Client disconnected: ${clientId}`);
    });

    this.send(ws, { type: "connected", clientId });
  }

  private async handleMessage(
    client: WsClient,
    data: Record<string, unknown>,
  ): Promise<void> {
    switch (data.type) {
      case "subscribe_agent":
        client.subscribedAgents.add(data.agentId as string);
        break;

      case "unsubscribe_agent":
        client.subscribedAgents.delete(data.agentId as string);
        break;

      case "agent_status_update": {
        const agentId = data.agentId as string;
        const status = data.status as string;
        await this.realizedAgentService.updateStatus(
          agentId,
          status as "idle" | "running" | "waiting" | "error" | "terminated",
        );
        await this.auditService.log({
          agentId,
          action: "agent_started",
          details: `Status: ${status} (via WS from ${client.clientId})`,
        });
        this.broadcastAgentUpdate(agentId, { status });
        break;
      }

      case "token_usage": {
        await this.tokenTracker.record({
          agentId: data.agentId as string,
          skillId: data.skillId as string | undefined,
          toolId: data.toolId as string | undefined,
          contextId: (data.contextId as string) ?? "",
          inputTokens: data.inputTokens as number,
          outputTokens: data.outputTokens as number,
          model: data.model as string,
          provider: data.provider as string,
          type: data.usageType as "agent" | "skill" | "tool",
        });
        break;
      }

      case "audit_entry": {
        await this.auditService.log({
          agentId: data.agentId as string,
          action: data.action as string,
          details: data.details as string,
          contextId: data.contextId as string | undefined,
          parentAgentId: data.parentAgentId as string | undefined,
          inputTokens: data.inputTokens as number | undefined,
          outputTokens: data.outputTokens as number | undefined,
        });
        break;
      }

      case "list_agents": {
        const agents = await this.realizedAgentService.list({
          clientId: client.clientId,
        });
        this.send(client.ws, { type: "agents_list", agents });
        break;
      }

      default:
        this.send(client.ws, {
          type: "error",
          message: `Unknown message type: ${data.type}`,
        });
    }
  }

  private send(ws: WebSocket, data: Record<string, unknown>): void {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
}
