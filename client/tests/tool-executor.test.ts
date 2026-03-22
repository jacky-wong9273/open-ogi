import { describe, it, expect, beforeEach, vi } from "vitest";
import { ToolExecutor } from "../src/runtime/tool-executor.js";
import { ToolRegistry } from "../src/runtime/tool-registry.js";
import { AuditLogger } from "../src/runtime/audit-logger.js";
import type { ToolContext, RegisteredTool } from "@open-ogi/shared";

function createMockTool(
  name: string,
  overrides?: Partial<RegisteredTool>,
): RegisteredTool {
  return {
    name,
    description: `Mock tool: ${name}`,
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: async (_params, _ctx) => ({
      success: true,
      output: [{ type: "text", text: `${name} result` }],
      durationMs: 5,
    }),
    ...overrides,
  };
}

function createMockContext(): ToolContext {
  return {
    agentId: "agent-1",
    sessionKey: "session-1",
    environment: "development",
    config: {},
    contextId: "ctx-1",
  };
}

describe("ToolExecutor", () => {
  let registry: ToolRegistry;
  let auditLogger: AuditLogger;
  let executor: ToolExecutor;

  beforeEach(() => {
    registry = new ToolRegistry();
    auditLogger = new AuditLogger("agent-1");
    executor = new ToolExecutor(registry, auditLogger);
  });

  it("executes a registered tool successfully", async () => {
    const tool = createMockTool("echo");
    registry.registerTool(tool);

    const result = await executor.execute("echo", {}, createMockContext());
    expect(result.success).toBe(true);
    expect(result.output[0]).toEqual({ type: "text", text: "echo result" });
  });

  it("returns error for unknown tool", async () => {
    const result = await executor.execute(
      "nonexistent",
      {},
      createMockContext(),
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe("not_found");
  });

  it("enforces allowlist", async () => {
    registry.registerTool(createMockTool("allowed"));
    registry.registerTool(createMockTool("blocked"));
    executor.setAllowlist(["allowed"]);

    const okResult = await executor.execute(
      "allowed",
      {},
      createMockContext(),
    );
    expect(okResult.success).toBe(true);

    const blockedResult = await executor.execute(
      "blocked",
      {},
      createMockContext(),
    );
    expect(blockedResult.success).toBe(false);
    expect(blockedResult.error).toBe("unauthorized");
  });

  it("handles tool requiring approval", async () => {
    const tool = createMockTool("dangerous", { requiresApproval: true });
    registry.registerTool(tool);

    const result = await executor.execute("dangerous", {}, createMockContext());
    expect(result.success).toBe(false);
    expect(result.error).toBe("approval_required");
    expect(executor.getPendingApprovals()).toHaveLength(1);
  });

  it("handles tool execution errors gracefully", async () => {
    const tool = createMockTool("failing", {
      execute: async () => {
        throw new Error("Tool crashed");
      },
    });
    registry.registerTool(tool);

    const result = await executor.execute("failing", {}, createMockContext());
    expect(result.success).toBe(false);
    expect(result.error).toBe("execution_error");
    expect(result.output[0]).toEqual({
      type: "error",
      message: "Tool execution failed: Tool crashed",
    });
  });

  it("logs all invocations to audit", async () => {
    registry.registerTool(createMockTool("audited"));
    await executor.execute("audited", {}, createMockContext());

    const entries = auditLogger.getEntries();
    const toolEntries = entries.filter((e) => e.action === "tool_invoked");
    expect(toolEntries.length).toBeGreaterThanOrEqual(1);
  });

  it("tracks invocation history", async () => {
    registry.registerTool(createMockTool("tracked"));
    await executor.execute("tracked", { input: "test" }, createMockContext());

    const log = executor.getInvocationLog();
    expect(log).toHaveLength(1);
    expect(log[0].toolName).toBe("tracked");
    expect(log[0].params).toEqual({ input: "test" });
    expect(log[0].result.success).toBe(true);
  });

  it("approves and denies pending requests", () => {
    const tool = createMockTool("gated", { requiresApproval: true });
    registry.registerTool(tool);

    // trigger approval
    executor.execute("gated", {}, createMockContext());

    const pending = executor.getPendingApprovals();
    expect(pending).toHaveLength(1);

    // Deny the request
    const denied = executor.denyTool("non-existent-id", "admin");
    expect(denied).toBe(false);

    // Approve doesn't crash for non-existent
    const approved = executor.approveTool("non-existent-id", "admin");
    expect(approved).toBe(false);
  });
});
