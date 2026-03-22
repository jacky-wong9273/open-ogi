import { generateId, now } from "@open-ogi/shared";
import { ToolInputError, ToolAuthorizationError } from "@open-ogi/shared";
import type {
  ToolContext,
  ToolResult,
  ToolInvocationRecord,
  ToolApprovalRequest,
} from "@open-ogi/shared";
import type { ToolRegistry } from "./tool-registry.js";
import type { AuditLogger } from "./audit-logger.js";

/**
 * Executes tools from the registry with validation, approval gates,
 * and audit logging. Replaces the LLM-simulated tool invocation.
 *
 * Inspired by openclaw's tool execution pipeline.
 */
export class ToolExecutor {
  private pendingApprovals = new Map<string, ToolApprovalRequest>();
  private invocationLog: ToolInvocationRecord[] = [];
  private toolAllowlist: Set<string> | null = null;

  constructor(
    private registry: ToolRegistry,
    private auditLogger: AuditLogger,
  ) {}

  /** Set an explicit allowlist of permitted tool names */
  setAllowlist(toolNames: string[]): void {
    this.toolAllowlist = new Set(toolNames);
  }

  /** Execute a tool by name with parameter validation and audit */
  async execute(
    toolName: string,
    params: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const startedAt = now();
    const startMs = Date.now();

    // Check allowlist
    if (this.toolAllowlist && !this.toolAllowlist.has(toolName)) {
      this.auditLogger.log(
        "error",
        `Tool "${toolName}" is not in the agent's permitted tools list`,
      );
      return {
        success: false,
        output: [
          {
            type: "error",
            message: `Tool "${toolName}" is not permitted for this agent`,
          },
        ],
        durationMs: Date.now() - startMs,
        error: "unauthorized",
      };
    }

    // Resolve tool from registry
    const tool = this.registry.get(toolName, ctx);
    if (!tool) {
      this.auditLogger.log("error", `Tool "${toolName}" not found in registry`);
      return {
        success: false,
        output: [
          {
            type: "error",
            message: `Tool "${toolName}" is not available`,
          },
        ],
        durationMs: Date.now() - startMs,
        error: "not_found",
      };
    }

    // Check approval gate
    if (tool.requiresApproval) {
      const approvalId = generateId();
      this.pendingApprovals.set(approvalId, {
        toolName,
        agentId: ctx.agentId,
        params,
        reason: `Tool "${toolName}" requires manual approval`,
        requestedAt: now(),
      });
      this.auditLogger.log(
        "tool_invoked",
        `Tool "${toolName}" requires approval (id: ${approvalId})`,
        { contextId: ctx.contextId },
      );
      return {
        success: false,
        output: [
          {
            type: "text",
            text: `Tool "${toolName}" requires approval. Request ID: ${approvalId}`,
          },
        ],
        durationMs: Date.now() - startMs,
        error: "approval_required",
      };
    }

    // Execute the tool
    this.auditLogger.log(
      "tool_invoked",
      `Executing tool "${toolName}" with ${Object.keys(params).length} params`,
      { contextId: ctx.contextId },
    );

    try {
      const result = await tool.execute(params, ctx);
      const completedAt = now();

      this.invocationLog.push({
        id: generateId(),
        toolName,
        agentId: ctx.agentId,
        contextId: ctx.contextId ?? "",
        params,
        result,
        startedAt,
        completedAt,
        approved: true,
      });

      this.auditLogger.log(
        "tool_invoked",
        `Tool "${toolName}" completed (${result.success ? "success" : "error"}, ${result.durationMs}ms)`,
        { contextId: ctx.contextId },
      );

      return result;
    } catch (err) {
      const durationMs = Date.now() - startMs;

      if (err instanceof ToolInputError) {
        this.auditLogger.log(
          "error",
          `Tool "${toolName}" input error: ${err.message}`,
          { contextId: ctx.contextId },
        );
        return {
          success: false,
          output: [{ type: "error", message: err.message }],
          durationMs,
          error: "input_error",
        };
      }

      if (err instanceof ToolAuthorizationError) {
        this.auditLogger.log(
          "error",
          `Tool "${toolName}" authorization error: ${err.message}`,
          { contextId: ctx.contextId },
        );
        return {
          success: false,
          output: [{ type: "error", message: err.message }],
          durationMs,
          error: "authorization_error",
        };
      }

      this.auditLogger.log(
        "error",
        `Tool "${toolName}" execution error: ${(err as Error).message}`,
        { contextId: ctx.contextId },
      );

      return {
        success: false,
        output: [
          {
            type: "error",
            message: `Tool execution failed: ${(err as Error).message}`,
          },
        ],
        durationMs,
        error: "execution_error",
      };
    }
  }

  /** Approve a pending tool execution request and re-execute the tool */
  async approveTool(
    requestId: string,
    decidedBy: string,
  ): Promise<ToolResult | null> {
    const request = this.pendingApprovals.get(requestId);
    if (!request) return null;
    this.pendingApprovals.delete(requestId);

    this.auditLogger.log(
      "tool_invoked",
      `Tool "${request.toolName}" approved by ${decidedBy}, re-executing`,
    );

    const ctx: ToolContext = {
      agentId: request.agentId,
      contextId: "",
      sessionKey: "",
      environment: "",
      config: {},
    };
    const tool = this.registry.get(request.toolName, ctx);
    if (!tool) return null;

    const startedAt = now();
    const startMs = Date.now();
    try {
      const result = await tool.execute(request.params, ctx);
      const completedAt = now();

      this.invocationLog.push({
        id: generateId(),
        toolName: request.toolName,
        agentId: request.agentId,
        contextId: ctx.contextId ?? "",
        params: request.params,
        result,
        startedAt,
        completedAt,
        approved: true,
      });

      this.auditLogger.log(
        "tool_invoked",
        `Tool "${request.toolName}" (approved) completed (${result.success ? "success" : "error"}, ${result.durationMs}ms)`,
      );

      return result;
    } catch (err) {
      this.auditLogger.log(
        "error",
        `Tool "${request.toolName}" (approved) execution error: ${(err as Error).message}`,
      );
      return {
        success: false,
        output: [
          {
            type: "error",
            message: `Tool execution failed: ${(err as Error).message}`,
          },
        ],
        durationMs: Date.now() - startMs,
        error: "execution_error",
      };
    }
  }

  /** Deny a pending tool execution request */
  denyTool(requestId: string, decidedBy: string, reason?: string): boolean {
    const request = this.pendingApprovals.get(requestId);
    if (!request) return false;
    this.pendingApprovals.delete(requestId);
    this.auditLogger.log(
      "tool_invoked",
      `Tool "${request.toolName}" approval denied by ${decidedBy}: ${reason ?? "no reason"}`,
    );
    return true;
  }

  /** Get all pending approval requests */
  getPendingApprovals(): ToolApprovalRequest[] {
    return Array.from(this.pendingApprovals.values());
  }

  /** Get invocation history */
  getInvocationLog(): ToolInvocationRecord[] {
    return [...this.invocationLog];
  }
}
