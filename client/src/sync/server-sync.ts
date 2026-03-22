import WebSocket from "ws";
import type { WorkflowEngine } from "../runtime/workflow-engine.js";

/**
 * Syncs client-side agent state to the server via WebSocket.
 * Reports: status updates, token usage, audit entries.
 */
export class ServerSync {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnected = false;

  constructor(
    private serverWsUrl: string,
    private authToken: string,
    private clientId: string,
    private engine: WorkflowEngine,
  ) {}

  connect(): void {
    const url = `${this.serverWsUrl}?token=${encodeURIComponent(this.authToken)}&clientId=${encodeURIComponent(this.clientId)}`;
    this.ws = new WebSocket(url);

    this.ws.on("open", () => {
      this.isConnected = true;
      console.log("Connected to server gateway");
      this.syncAllAgents();
    });

    this.ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleServerMessage(msg);
      } catch {
        // ignore invalid messages
      }
    });

    this.ws.on("close", () => {
      this.isConnected = false;
      console.log("Disconnected from server, reconnecting in 5s...");
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    });

    this.ws.on("error", (err) => {
      console.error("WebSocket error:", err.message);
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.isConnected = false;
  }

  /** Report agent status update to server */
  reportStatus(agentId: string, status: string): void {
    this.send({
      type: "agent_status_update",
      agentId,
      status,
    });
  }

  /** Report token usage to server */
  reportTokenUsage(data: {
    agentId: string;
    skillId?: string;
    toolId?: string;
    contextId: string;
    inputTokens: number;
    outputTokens: number;
    model: string;
    provider: string;
    usageType: "agent" | "skill" | "tool";
  }): void {
    this.send({ type: "token_usage", ...data });
  }

  /** Report audit entry to server */
  reportAuditEntry(entry: Record<string, unknown>): void {
    this.send({ type: "audit_entry", ...entry });
  }

  private syncAllAgents(): void {
    for (const agent of this.engine.getAgents()) {
      this.send({
        type: "agent_status_update",
        agentId: agent.getId(),
        status: agent.getStatus(),
      });
      this.send({ type: "subscribe_agent", agentId: agent.getId() });
    }
  }

  private handleServerMessage(msg: Record<string, unknown>): void {
    switch (msg.type) {
      case "agent_update":
        // Server-initiated agent update (e.g., admin termination)
        if (
          msg.data &&
          (msg.data as Record<string, unknown>).status === "terminated"
        ) {
          const agentId = msg.agentId as string;
          this.engine.terminateAgent(agentId);
        }
        break;
    }
  }

  private send(data: Record<string, unknown>): void {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}
