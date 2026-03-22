import { describe, it, expect, beforeEach, vi } from "vitest";
import { SubagentSpawner } from "../src/runtime/subagent-spawner.js";
import type { AgentRuntime } from "../src/runtime/agent-runtime.js";
import type { AbstractAgent } from "@open-ogi/shared";
import { MAX_SUBAGENT_DEPTH } from "@open-ogi/shared";

/** Create a mock AgentRuntime with controllable getters */
function createMockRuntime(overrides?: {
  id?: string;
  parentId?: string;
  spawnDepth?: number;
}): AgentRuntime {
  const id =
    overrides?.id ?? `subagent-${Math.random().toString(36).slice(2, 8)}`;
  return {
    getId: vi.fn().mockReturnValue(id),
    getParentId: vi.fn().mockReturnValue(overrides?.parentId),
    getSpawnDepth: vi.fn().mockReturnValue(overrides?.spawnDepth ?? 0),
    getAuditLogger: vi.fn().mockReturnValue({
      log: vi.fn(),
    }),
    terminate: vi.fn(),
  } as unknown as AgentRuntime;
}

function createMockAbstractAgent(name?: string): AbstractAgent {
  return {
    id: "abstract-1",
    name: name ?? "Test Subagent",
    description: "A test subagent",
    agentMd: "",
    instructionsMd: "",
    skillsMd: "",
    toolsMd: "",
    references: [],
    permittedSkills: [],
    permittedTools: [],
    createdBy: "test",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    environment: "development",
    isPublic: false,
  };
}

describe("SubagentSpawner", () => {
  let spawner: SubagentSpawner;
  let createRuntimeFn: ReturnType<typeof vi.fn>;
  let parentAgent: AgentRuntime;

  beforeEach(() => {
    parentAgent = createMockRuntime({ id: "parent-1", spawnDepth: 0 });

    createRuntimeFn = vi.fn(
      (
        agent: AbstractAgent,
        parentId: string,
        depth: number,
        contextId: string,
      ) => {
        return createMockRuntime({
          id: `child-${depth}-${Math.random().toString(36).slice(2, 8)}`,
          parentId,
          spawnDepth: depth,
        });
      },
    );

    spawner = new SubagentSpawner(createRuntimeFn);
  });

  it("spawn creates a subagent at parentDepth + 1", () => {
    const result = spawner.spawn({
      parentAgent,
      abstractAgent: createMockAbstractAgent(),
      task: "do something",
      contextId: "ctx-1",
    });

    expect(result).not.toBeNull();
    expect(createRuntimeFn).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Test Subagent" }),
      "parent-1",
      1, // parentDepth (0) + 1
      "ctx-1",
    );
  });

  it("spawn returns null when max depth is reached", () => {
    // Parent is at MAX_SUBAGENT_DEPTH (2), so spawning should be rejected
    const deepParent = createMockRuntime({
      id: "deep-parent",
      spawnDepth: MAX_SUBAGENT_DEPTH,
    });

    const result = spawner.spawn({
      parentAgent: deepParent,
      abstractAgent: createMockAbstractAgent(),
      task: "impossible",
      contextId: "ctx-1",
    });

    expect(result).toBeNull();
    expect(createRuntimeFn).not.toHaveBeenCalled();
    // Verify the error was logged
    expect(deepParent.getAuditLogger().log).toHaveBeenCalledWith(
      "error",
      expect.stringContaining("max depth"),
      expect.objectContaining({ contextId: "ctx-1" }),
    );
  });

  it("spawn at depth MAX_SUBAGENT_DEPTH - 1 still succeeds", () => {
    const almostDeepParent = createMockRuntime({
      id: "almost-deep",
      spawnDepth: MAX_SUBAGENT_DEPTH - 1,
    });

    const result = spawner.spawn({
      parentAgent: almostDeepParent,
      abstractAgent: createMockAbstractAgent(),
      task: "last level",
      contextId: "ctx-1",
    });

    expect(result).not.toBeNull();
  });

  it("terminateSubagent calls subagent.terminate()", () => {
    const child = spawner.spawn({
      parentAgent,
      abstractAgent: createMockAbstractAgent(),
      task: "work",
      contextId: "ctx-1",
    })!;

    const childId = child.getId();
    spawner.terminateSubagent(childId);

    expect(child.terminate).toHaveBeenCalled();
    // After termination, the subagent is removed from active list
    expect(spawner.getSubagent(childId)).toBeUndefined();
  });

  it("terminateSubagent is a no-op for unknown id", () => {
    // Should not throw
    expect(() => spawner.terminateSubagent("unknown-id")).not.toThrow();
  });

  it("getActiveSubagents returns the active list", () => {
    expect(spawner.getActiveSubagents()).toHaveLength(0);

    const child1 = spawner.spawn({
      parentAgent,
      abstractAgent: createMockAbstractAgent("Agent A"),
      task: "task-a",
      contextId: "ctx-1",
    })!;
    const child2 = spawner.spawn({
      parentAgent,
      abstractAgent: createMockAbstractAgent("Agent B"),
      task: "task-b",
      contextId: "ctx-2",
    })!;

    const active = spawner.getActiveSubagents();
    expect(active).toHaveLength(2);
    expect(active.map((a) => a.getId())).toContain(child1.getId());
    expect(active.map((a) => a.getId())).toContain(child2.getId());
  });

  it("getActiveSubagents does not include terminated subagents", () => {
    const child = spawner.spawn({
      parentAgent,
      abstractAgent: createMockAbstractAgent(),
      task: "temp-work",
      contextId: "ctx-1",
    })!;

    spawner.terminateSubagent(child.getId());

    expect(spawner.getActiveSubagents()).toHaveLength(0);
  });

  it("getSubagentsByParent filters correctly", () => {
    const parentA = createMockRuntime({ id: "parent-a", spawnDepth: 0 });
    const parentB = createMockRuntime({ id: "parent-b", spawnDepth: 0 });

    // Update createRuntimeFn to produce children with the correct parentId
    createRuntimeFn.mockImplementation(
      (
        _agent: AbstractAgent,
        parentId: string,
        depth: number,
        _contextId: string,
      ) => {
        return createMockRuntime({
          id: `child-of-${parentId}-${Math.random().toString(36).slice(2, 8)}`,
          parentId,
          spawnDepth: depth,
        });
      },
    );

    spawner.spawn({
      parentAgent: parentA,
      abstractAgent: createMockAbstractAgent("A-child-1"),
      task: "task-1",
      contextId: "ctx-1",
    });
    spawner.spawn({
      parentAgent: parentA,
      abstractAgent: createMockAbstractAgent("A-child-2"),
      task: "task-2",
      contextId: "ctx-2",
    });
    spawner.spawn({
      parentAgent: parentB,
      abstractAgent: createMockAbstractAgent("B-child-1"),
      task: "task-3",
      contextId: "ctx-3",
    });

    const parentAChildren = spawner.getSubagentsByParent("parent-a");
    expect(parentAChildren).toHaveLength(2);
    expect(parentAChildren.every((c) => c.getParentId() === "parent-a")).toBe(
      true,
    );

    const parentBChildren = spawner.getSubagentsByParent("parent-b");
    expect(parentBChildren).toHaveLength(1);
    expect(parentBChildren[0].getParentId()).toBe("parent-b");

    const noneChildren = spawner.getSubagentsByParent("nonexistent");
    expect(noneChildren).toHaveLength(0);
  });

  it("spawn logs audit entries on both parent and child", () => {
    const child = spawner.spawn({
      parentAgent,
      abstractAgent: createMockAbstractAgent(),
      task: "audited task",
      contextId: "ctx-1",
    })!;

    // Parent should log "subagent_spawned"
    expect(parentAgent.getAuditLogger().log).toHaveBeenCalledWith(
      "subagent_spawned",
      expect.stringContaining(child.getId()),
      expect.objectContaining({ contextId: "ctx-1" }),
    );

    // Child should log "agent_started"
    expect(child.getAuditLogger().log).toHaveBeenCalledWith(
      "agent_started",
      expect.stringContaining("parent-1"),
      expect.objectContaining({
        contextId: "ctx-1",
        parentAgentId: "parent-1",
      }),
    );
  });

  it("getSubagent retrieves a subagent by id", () => {
    const child = spawner.spawn({
      parentAgent,
      abstractAgent: createMockAbstractAgent(),
      task: "work",
      contextId: "ctx-1",
    })!;

    const found = spawner.getSubagent(child.getId());
    expect(found).toBe(child);
  });

  it("getSubagent returns undefined for unknown id", () => {
    expect(spawner.getSubagent("unknown")).toBeUndefined();
  });
});
