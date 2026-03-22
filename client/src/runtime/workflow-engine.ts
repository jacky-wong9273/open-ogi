import type { AbstractAgent } from "@open-ogi/shared";
import { generateId } from "@open-ogi/shared";
import type { LLMConfig } from "../llm/provider.js";
import { AgentRuntime, type AgentRuntimeConfig } from "./agent-runtime.js";
import { ContextManager } from "./context-manager.js";
import { SubagentSpawner } from "./subagent-spawner.js";
import { ToolRegistry } from "./tool-registry.js";
import { HookManager } from "./hook-manager.js";
import { AuditLogger } from "./audit-logger.js";
import { ServerSync } from "../sync/server-sync.js";

export interface WorkflowEngineConfig {
  llmConfig: LLMConfig;
  environment: string;
  clientId: string;
  serverUrl?: string;
  wsUrl?: string;
  authToken?: string;
}

/**
 * Orchestrates the full agentic workflow:
 * - Manages permanent and temporary agent lifecycles
 * - Handles inter-agent communication
 * - Enforces spawn depth limits
 * - Syncs state to server when connected
 */
export class WorkflowEngine {
  private permanentAgents = new Map<string, AgentRuntime>();
  private contextManager: ContextManager;
  private subagentSpawner: SubagentSpawner;
  private toolRegistry: ToolRegistry;
  private hookManager: HookManager;
  private config: WorkflowEngineConfig;
  private serverSync: ServerSync | null = null;

  constructor(config: WorkflowEngineConfig) {
    this.config = config;
    this.contextManager = new ContextManager();
    this.toolRegistry = new ToolRegistry();
    this.hookManager = new HookManager();

    this.subagentSpawner = new SubagentSpawner(
      (abstractAgent, parentId, depth, contextId) => {
        return this.createRuntime(
          abstractAgent,
          "temporary",
          parentId,
          depth,
          contextId,
        );
      },
    );

    // Connect to server when URL and auth token are provided
    if (config.wsUrl && config.authToken) {
      this.serverSync = new ServerSync(
        config.wsUrl,
        config.authToken,
        config.clientId,
        this,
      );
      this.serverSync.connect();
    }
  }

  /** Instantiate a permanent agent from an abstract definition */
  deployAgent(abstractAgent: AbstractAgent, contextId?: string): AgentRuntime {
    const ctx =
      contextId ??
      this.contextManager.createContext(
        `${abstractAgent.name}-workspace`,
        `Workspace for ${abstractAgent.name}`,
      );

    const runtime = this.createRuntime(
      abstractAgent,
      "permanent",
      undefined,
      0,
      ctx,
    );
    this.permanentAgents.set(runtime.getId(), runtime);

    this.serverSync?.reportStatus(runtime.getId(), "running");

    return runtime;
  }

  /** Spawn a temporary subagent */
  spawnSubagent(
    parentAgent: AgentRuntime,
    abstractAgent: AbstractAgent,
    task: string,
    contextId: string,
  ): AgentRuntime | null {
    return this.subagentSpawner.spawn({
      parentAgent,
      abstractAgent,
      task,
      contextId,
    });
  }

  /** Send message between permanent agents */
  async agentToAgent(
    fromAgentId: string,
    toAgentId: string,
    message: string,
    contextId: string,
  ): Promise<string> {
    const fromAgent = this.permanentAgents.get(fromAgentId);
    const toAgent = this.permanentAgents.get(toAgentId);

    if (!fromAgent || !toAgent) {
      throw new Error("Both agents must be deployed permanent agents");
    }

    if (
      fromAgent.getType() !== "permanent" ||
      toAgent.getType() !== "permanent"
    ) {
      throw new Error("Only permanent agents can communicate with each other");
    }

    // Send from source agent
    fromAgent.sendMessage(toAgentId, message, contextId);

    // Process at target agent
    const response = await toAgent.processMessage(
      `[Message from ${fromAgent.getAbstractAgent().name}]: ${message}`,
      contextId,
    );

    return response.content;
  }

  /** Create a shared context for agent collaboration */
  createCollaborationContext(
    name: string,
    description: string,
    agentIds: string[],
  ): string {
    const contextId = this.contextManager.createContext(name, description);
    for (const agentId of agentIds) {
      this.contextManager.addParticipant(contextId, agentId);
    }
    return contextId;
  }

  /** Get all deployed agents */
  getAgents(): AgentRuntime[] {
    const all: AgentRuntime[] = Array.from(this.permanentAgents.values());
    all.push(...this.subagentSpawner.getActiveSubagents());
    return all;
  }

  getAgent(id: string): AgentRuntime | undefined {
    return this.permanentAgents.get(id) ?? this.subagentSpawner.getSubagent(id);
  }

  getContextManager(): ContextManager {
    return this.contextManager;
  }

  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  getHookManager(): HookManager {
    return this.hookManager;
  }

  /** Terminate an agent */
  terminateAgent(agentId: string): void {
    const permanent = this.permanentAgents.get(agentId);
    if (permanent) {
      permanent.terminate();
      this.permanentAgents.delete(agentId);
      this.serverSync?.reportStatus(agentId, "terminated");
      return;
    }
    this.subagentSpawner.terminateSubagent(agentId);
  }

  /** Disconnect from server */
  disconnect(): void {
    this.serverSync?.disconnect();
    this.serverSync = null;
  }

  /** Check if connected to server */
  isServerConnected(): boolean {
    return this.serverSync !== null;
  }

  private createRuntime(
    abstractAgent: AbstractAgent,
    type: "permanent" | "temporary",
    parentId: string | undefined,
    spawnDepth: number,
    contextId: string,
  ): AgentRuntime {
    const runtimeConfig: AgentRuntimeConfig = {
      abstractAgent,
      llmConfig: this.config.llmConfig,
      type,
      parentId,
      spawnDepth,
      contextId,
      environment: this.config.environment,
      clientId: this.config.clientId,
    };

    return new AgentRuntime(
      runtimeConfig,
      this.contextManager,
      this.toolRegistry,
      this.hookManager,
    );
  }
}
