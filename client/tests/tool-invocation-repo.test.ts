import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  initClientDatabase,
  closeClientDatabase,
} from "../src/db/client-db.js";
import { ToolInvocationRepository } from "../src/db/repositories/tool-invocation-repo.js";

describe("ToolInvocationRepository", () => {
  let repo: ToolInvocationRepository;

  beforeEach(() => {
    initClientDatabase(":memory:");
    repo = new ToolInvocationRepository();
  });

  afterEach(() => {
    closeClientDatabase();
  });

  it("records an invocation and returns its id", () => {
    const id = repo.record({
      toolName: "git-operations",
      agentId: "agent-1",
      params: { branch: "main" },
      result: { status: "ok" },
      success: true,
      durationMs: 120,
    });

    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
  });

  it("getByAgent returns invocations for a specific agent", () => {
    repo.record({
      toolName: "git-operations",
      agentId: "agent-1",
      params: { action: "pull" },
      result: { status: "success" },
      success: true,
      durationMs: 50,
    });
    repo.record({
      toolName: "code-analyzer",
      agentId: "agent-1",
      params: { file: "index.ts" },
      result: { issues: 0 },
      success: true,
      durationMs: 200,
    });
    repo.record({
      toolName: "git-operations",
      agentId: "agent-2",
      params: { action: "push" },
      result: { status: "done" },
      success: true,
      durationMs: 30,
    });

    const agent1Invocations = repo.getByAgent("agent-1");
    expect(agent1Invocations).toHaveLength(2);
    expect(agent1Invocations.every((inv) => inv.agentId === "agent-1")).toBe(
      true,
    );

    const agent2Invocations = repo.getByAgent("agent-2");
    expect(agent2Invocations).toHaveLength(1);
    expect(agent2Invocations[0].toolName).toBe("git-operations");
  });

  it("getByAgent with limit returns at most N entries", () => {
    for (let i = 0; i < 10; i++) {
      repo.record({
        toolName: "echo",
        agentId: "agent-1",
        params: { i },
        result: { i },
        success: true,
        durationMs: i,
      });
    }

    const limited = repo.getByAgent("agent-1", 3);
    expect(limited).toHaveLength(3);
  });

  it("getByAgent returns empty array for unknown agent", () => {
    const result = repo.getByAgent("unknown-agent");
    expect(result).toEqual([]);
  });

  it("getByTool returns invocations for a specific tool", () => {
    repo.record({
      toolName: "git-operations",
      agentId: "agent-1",
      params: {},
      result: {},
      success: true,
      durationMs: 10,
    });
    repo.record({
      toolName: "code-analyzer",
      agentId: "agent-1",
      params: {},
      result: {},
      success: false,
      durationMs: 5,
    });
    repo.record({
      toolName: "git-operations",
      agentId: "agent-2",
      params: {},
      result: {},
      success: true,
      durationMs: 15,
    });

    const gitInvocations = repo.getByTool("git-operations");
    expect(gitInvocations).toHaveLength(2);
    expect(
      gitInvocations.every((inv) => inv.toolName === "git-operations"),
    ).toBe(true);
  });

  it("records preserve params and result as parsed JSON objects", () => {
    repo.record({
      toolName: "complex-tool",
      agentId: "agent-1",
      params: { nested: { key: "value" }, list: [1, 2, 3] },
      result: { output: "done", count: 42 },
      success: true,
      durationMs: 100,
    });

    const invocations = repo.getByAgent("agent-1");
    expect(invocations[0].params).toEqual({
      nested: { key: "value" },
      list: [1, 2, 3],
    });
    expect(invocations[0].result).toEqual({ output: "done", count: 42 });
  });

  it("records success and failure correctly", () => {
    repo.record({
      toolName: "may-fail",
      agentId: "agent-1",
      params: {},
      result: { error: "timeout" },
      success: false,
      durationMs: 5000,
    });
    repo.record({
      toolName: "may-fail",
      agentId: "agent-1",
      params: {},
      result: { output: "ok" },
      success: true,
      durationMs: 100,
    });

    const invocations = repo.getByAgent("agent-1");
    // Most recent first (ORDER BY started_at DESC)
    const successInv = invocations.find((inv) => inv.success);
    const failureInv = invocations.find((inv) => !inv.success);

    expect(successInv).toBeDefined();
    expect(failureInv).toBeDefined();
    expect(failureInv!.durationMs).toBe(5000);
  });

  it("contextId defaults to empty string when not provided", () => {
    repo.record({
      toolName: "test-tool",
      agentId: "agent-1",
      params: {},
      result: {},
      success: true,
      durationMs: 1,
    });

    const invocations = repo.getByAgent("agent-1");
    expect(invocations[0].contextId).toBe("");
  });

  it("contextId is stored when provided", () => {
    repo.record({
      toolName: "test-tool",
      agentId: "agent-1",
      contextId: "ctx-abc",
      params: {},
      result: {},
      success: true,
      durationMs: 1,
    });

    const invocations = repo.getByAgent("agent-1");
    expect(invocations[0].contextId).toBe("ctx-abc");
  });

  it("count returns the total number of invocations", () => {
    expect(repo.count()).toBe(0);

    repo.record({
      toolName: "a",
      agentId: "x",
      params: {},
      result: {},
      success: true,
      durationMs: 1,
    });
    repo.record({
      toolName: "b",
      agentId: "y",
      params: {},
      result: {},
      success: true,
      durationMs: 2,
    });

    expect(repo.count()).toBe(2);
  });

  it("completedAt is populated on recorded invocations", () => {
    repo.record({
      toolName: "timed-tool",
      agentId: "agent-1",
      params: {},
      result: {},
      success: true,
      durationMs: 50,
    });

    const invocations = repo.getByAgent("agent-1");
    expect(invocations[0].completedAt).toBeTruthy();
  });
});
