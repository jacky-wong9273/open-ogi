import type { AbstractAgent, AgentStatus, AgentType, ToolContext } from "@open-ogi/shared";
import { generateId, now } from "@open-ogi/shared";
import {
  LLMProvider,
  type LLMConfig,
  type LLMResponse,
} from "../llm/provider.js";
import { AuditLogger } from "./audit-logger.js";
import { ContextManager } from "./context-manager.js";
import { ToolRegistry } from "./tool-registry.js";
import { ToolExecutor } from "./tool-executor.js";
import { HookManager } from "./hook-manager.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export interface AgentRuntimeConfig {
  abstractAgent: AbstractAgent;
  llmConfig: LLMConfig;
  type: AgentType;
  parentId?: string;
  spawnDepth: number;
  contextId?: string;
  environment: string;
  clientId: string;
}

/**
 * Core agent runtime — instantiates an abstract agent definition
 * into a running agent with LLM capabilities, skill/tool enforcement,
 * and audit logging.
 */
export class AgentRuntime {
  private id: string;
  private status: AgentStatus = "idle";
  private llm: LLMProvider;
  private auditLogger: AuditLogger;
  private contextManager: ContextManager;
  private toolRegistry: ToolRegistry;
  private toolExecutor: ToolExecutor;
  private hookManager: HookManager;
  private conversationHistory: ChatCompletionMessageParam[] = [];
  private config: AgentRuntimeConfig;
  private totalInputTokens = 0;
  private totalOutputTokens = 0;

  constructor(
    config: AgentRuntimeConfig,
    contextManager: ContextManager,
    toolRegistry?: ToolRegistry,
    hookManager?: HookManager,
  ) {
    this.id = generateId();
    this.config = config;
    this.llm = new LLMProvider(config.llmConfig);
    this.auditLogger = new AuditLogger(this.id);
    this.contextManager = contextManager;
    this.toolRegistry = toolRegistry ?? new ToolRegistry();
    this.hookManager = hookManager ?? new HookManager();
    this.toolExecutor = new ToolExecutor(this.toolRegistry, this.auditLogger);

    // Set tool allowlist from the agent definition
    if (config.abstractAgent.permittedTools.length > 0) {
      this.toolExecutor.setAllowlist(config.abstractAgent.permittedTools);
    }

    // Register in context if provided
    if (config.contextId) {
      contextManager.addParticipant(config.contextId, this.id);
    }

    this.auditLogger.log(
      "agent_started",
      `Agent initialized: ${config.abstractAgent.name} (${config.type})`,
    );

    // Emit lifecycle hook
    void this.hookManager.emit("after-agent-start", this.buildHookContext(), {
      agentType: config.type,
      spawnDepth: config.spawnDepth,
    });
  }

  /** Build the system prompt from the abstract agent definition */
  private buildSystemPrompt(): string {
    const agent = this.config.abstractAgent;
    let prompt = "";

    // Admin system prompt override
    if (agent.systemPromptOverride) {
      prompt += agent.systemPromptOverride + "\n\n";
    }

    // Core agent identity
    prompt += `# Agent: ${agent.name}\n\n`;
    prompt += agent.agentMd + "\n\n";

    // Instructions (MUST follow)
    prompt += "## Instructions\n\n";
    prompt += agent.instructionsMd + "\n\n";

    // Permitted skills
    prompt += "## Available Skills\n\n";
    prompt += agent.skillsMd + "\n\n";
    prompt += `**You MUST only use the following skills:** ${agent.permittedSkills.join(", ")}\n\n`;

    // Permitted tools
    prompt += "## Available Tools\n\n";
    prompt += agent.toolsMd + "\n\n";
    prompt += `**You MUST only use the following tools:** ${agent.permittedTools.join(", ")}\n\n`;

    // Style (optional)
    if (agent.styleMd) {
      prompt += "## Communication Style\n\n";
      prompt += agent.styleMd + "\n\n";
    }

    // Compliance enforcement
    prompt += "## Compliance\n\n";
    prompt += "- You MUST follow the instructions above strictly.\n";
    prompt +=
      "- You MUST NOT use any skills or tools not listed in your permitted lists.\n";
    prompt += "- All your actions are logged for audit purposes.\n";
    prompt += "- Report any anomalies or policy violations immediately.\n\n";

    // Context references if available
    if (this.config.contextId) {
      const contextPrompt = this.contextManager.buildContextPrompt(
        this.config.contextId,
      );
      if (contextPrompt) {
        prompt += contextPrompt;
      }
    }

    // Agent references
    if (agent.references.length > 0) {
      prompt += "## Working References\n\n";
      for (const ref of agent.references) {
        prompt += `### ${ref.filename}\n\n${ref.content}\n\n`;
      }
    }

    return prompt;
  }

  /** Process a message and get a response */
  async processMessage(
    userMessage: string,
    contextId?: string,
  ): Promise<LLMResponse> {
    this.status = "running";

    // Add context if a new contextId is provided
    if (contextId && contextId !== this.config.contextId) {
      this.config.contextId = contextId;
      this.contextManager.addParticipant(contextId, this.id);
    }

    const hookCtx = this.buildHookContext();

    // Emit before-message hook
    await this.hookManager.emit("before-message", hookCtx, {
      message: userMessage,
      contextId: contextId ?? this.config.contextId,
    });

    this.conversationHistory.push({ role: "user", content: userMessage });

    this.auditLogger.log(
      "message_received",
      `Received message (${userMessage.length} chars)`,
      {
        contextId: contextId ?? this.config.contextId,
      },
    );

    try {
      const response = await this.llm.chat(this.conversationHistory, {
        systemPrompt: this.buildSystemPrompt(),
      });

      this.conversationHistory.push({
        role: "assistant",
        content: response.content,
      });

      this.totalInputTokens += response.inputTokens;
      this.totalOutputTokens += response.outputTokens;

      this.auditLogger.log(
        "message_sent",
        `Generated response (${response.outputTokens} tokens)`,
        {
          contextId: contextId ?? this.config.contextId,
          tokenUsage: {
            input: response.inputTokens,
            output: response.outputTokens,
          },
        },
      );

      // Save progress to references if permanent
      if (this.config.type === "permanent" && this.config.contextId) {
        this.saveProgressToReference();
      }

      // Emit after-message hook
      await this.hookManager.emit("after-message", hookCtx, {
        response: response.content,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
      });

      this.status = "idle";
      return response;
    } catch (err) {
      this.status = "error";
      this.auditLogger.log("error", `LLM error: ${(err as Error).message}`, {
        contextId: contextId ?? this.config.contextId,
      });

      // Emit error hook
      await this.hookManager.emit("agent-error", hookCtx, {
        error: (err as Error).message,
      });

      throw err;
    }
  }

  /** Save conversation summary to references to avoid token burst */
  private saveProgressToReference(): void {
    if (!this.config.contextId) return;

    // Keep last 10 messages as a summary reference
    const recentMessages = this.conversationHistory.slice(-10);
    const summary = recentMessages
      .map(
        (m) =>
          `**${m.role}**: ${typeof m.content === "string" ? m.content.slice(0, 200) : "..."}`,
      )
      .join("\n\n");

    this.contextManager.setReference(
      this.config.contextId,
      `progress-${this.id}.md`,
      `# Agent ${this.config.abstractAgent.name} Progress\n\n${summary}`,
    );
  }

  /** Invoke a skill (validates against permitted list) */
  async invokeSkill(skillName: string, input: string): Promise<LLMResponse> {
    if (!this.config.abstractAgent.permittedSkills.includes(skillName)) {
      this.auditLogger.log(
        "error",
        `Attempted to invoke unpermitted skill: ${skillName}`,
      );
      throw new Error(`Skill "${skillName}" is not permitted for this agent`);
    }

    await this.hookManager.emit(
      "before-skill-invoke",
      this.buildHookContext(),
      { skillName, input },
    );

    this.auditLogger.log("skill_invoked", `Invoking skill: ${skillName}`, {
      contextId: this.config.contextId,
    });

    const response = await this.processMessage(`[SKILL: ${skillName}] ${input}`);

    await this.hookManager.emit(
      "after-skill-invoke",
      this.buildHookContext(),
      { skillName, response: response.content },
    );

    return response;
  }

  /** Invoke a tool — uses ToolExecutor if registered, falls back to LLM-based */
  async invokeTool(
    toolName: string,
    input: string | Record<string, unknown>,
  ): Promise<LLMResponse> {
    if (!this.config.abstractAgent.permittedTools.includes(toolName)) {
      this.auditLogger.log(
        "error",
        `Attempted to invoke unpermitted tool: ${toolName}`,
      );
      throw new Error(`Tool "${toolName}" is not permitted for this agent`);
    }

    // Emit before-tool hook
    await this.hookManager.emit("before-tool-invoke", this.buildHookContext(), {
      toolName,
      input,
    });

    // Try registered tool executor first
    if (this.toolRegistry.has(toolName)) {
      const ctx = this.buildToolContext();
      const params =
        typeof input === "string" ? { input } : input;
      const result = await this.toolExecutor.execute(toolName, params, ctx);

      // Emit after-tool hook
      await this.hookManager.emit(
        "after-tool-invoke",
        this.buildHookContext(),
        { toolName, result },
      );

      // Convert ToolResult to LLMResponse for backward compatibility
      const outputText = result.output
        .map((o) => {
          if (o.type === "text") return o.text;
          if (o.type === "json") return JSON.stringify(o.data);
          if (o.type === "error") return `Error: ${o.message}`;
          return "";
        })
        .join("\n");

      return {
        content: outputText,
        inputTokens: 0,
        outputTokens: 0,
        model: "tool",
        provider: "tool-executor",
        finishReason: result.success ? "tool_complete" : "tool_error",
      };
    }

    // Fallback: LLM-based tool invocation
    this.auditLogger.log("tool_invoked", `Invoking tool: ${toolName}`, {
      contextId: this.config.contextId,
    });

    const inputStr = typeof input === "string" ? input : JSON.stringify(input);
    const response = await this.processMessage(`[TOOL: ${toolName}] ${inputStr}`);

    // Emit after-tool hook
    await this.hookManager.emit("after-tool-invoke", this.buildHookContext(), {
      toolName,
      response: response.content,
    });

    return response;
  }

  /** Send a message to another permanent agent */
  sendMessage(targetAgentId: string, message: string, contextId: string): void {
    if (this.config.type === "temporary") {
      throw new Error(
        "Temporary agents can only communicate with their parent agent",
      );
    }
    this.auditLogger.log(
      "message_sent",
      `Message to ${targetAgentId}: ${message.slice(0, 100)}...`,
      { contextId },
    );
  }

  // Getters
  getId(): string {
    return this.id;
  }
  getStatus(): AgentStatus {
    return this.status;
  }
  getType(): AgentType {
    return this.config.type;
  }
  getSpawnDepth(): number {
    return this.config.spawnDepth;
  }
  getParentId(): string | undefined {
    return this.config.parentId;
  }
  getAuditLogger(): AuditLogger {
    return this.auditLogger;
  }
  getAbstractAgent(): AbstractAgent {
    return this.config.abstractAgent;
  }
  getEnvironment(): string {
    return this.config.environment;
  }
  getTokenUsage(): { input: number; output: number } {
    return { input: this.totalInputTokens, output: this.totalOutputTokens };
  }
  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }
  getToolExecutor(): ToolExecutor {
    return this.toolExecutor;
  }
  getHookManager(): HookManager {
    return this.hookManager;
  }

  terminate(): void {
    this.status = "terminated";
    this.auditLogger.log("agent_stopped", "Agent terminated");
    void this.hookManager.emit("agent-terminated", this.buildHookContext(), {});
  }

  /** Build hook context from current agent state */
  private buildHookContext() {
    return {
      agentId: this.id,
      agentName: this.config.abstractAgent.name,
      environment: this.config.environment,
      contextId: this.config.contextId,
      timestamp: now(),
    };
  }

  /** Build tool execution context */
  private buildToolContext(): ToolContext {
    return {
      agentId: this.id,
      sessionKey: `${this.id}:${this.config.contextId ?? "default"}`,
      contextId: this.config.contextId,
      environment: this.config.environment,
      config: {},
    };
  }
}
