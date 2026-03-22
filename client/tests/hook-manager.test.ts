import { describe, it, expect, beforeEach, vi } from "vitest";
import { HookManager } from "../src/runtime/hook-manager.js";
import type { HookEvent, HookContext } from "@open-ogi/shared";

function createHookContext(): HookContext {
  return {
    agentId: "agent-1",
    agentName: "Test Agent",
    environment: "development",
    timestamp: new Date().toISOString(),
  };
}

describe("HookManager", () => {
  let manager: HookManager;

  beforeEach(() => {
    manager = new HookManager();
  });

  it("registers and emits hooks", async () => {
    const calls: string[] = [];

    manager.register("before-message", (event, ctx, data) => {
      calls.push(`${event}:${data.message}`);
    });

    await manager.emit("before-message", createHookContext(), {
      message: "hello",
    });

    expect(calls).toEqual(["before-message:hello"]);
  });

  it("supports multiple events per registration", async () => {
    const calls: HookEvent[] = [];

    manager.register(
      ["before-message", "after-message"],
      (event) => {
        calls.push(event);
      },
    );

    await manager.emit("before-message", createHookContext());
    await manager.emit("after-message", createHookContext());

    expect(calls).toEqual(["before-message", "after-message"]);
  });

  it("calls handlers in priority order", async () => {
    const order: number[] = [];

    manager.register("before-message", () => {
      order.push(2);
    }, { priority: 200 });

    manager.register("before-message", () => {
      order.push(1);
    }, { priority: 100 });

    manager.register("before-message", () => {
      order.push(3);
    }, { priority: 300 });

    await manager.emit("before-message", createHookContext());
    expect(order).toEqual([1, 2, 3]);
  });

  it("isolates errors between handlers", async () => {
    const calls: string[] = [];

    manager.register("before-message", () => {
      calls.push("first");
    }, { priority: 1 });

    manager.register("before-message", () => {
      throw new Error("Hook failed");
    }, { priority: 2 });

    manager.register("before-message", () => {
      calls.push("third");
    }, { priority: 3 });

    await manager.emit("before-message", createHookContext());
    expect(calls).toEqual(["first", "third"]);
  });

  it("unregisters hooks by ID", async () => {
    const calls: string[] = [];

    const id = manager.register("before-message", () => {
      calls.push("should-not-run");
    });

    manager.unregister(id);

    await manager.emit("before-message", createHookContext());
    expect(calls).toHaveLength(0);
  });

  it("handles async handlers", async () => {
    const calls: string[] = [];

    manager.register("after-message", async () => {
      await new Promise((r) => setTimeout(r, 10));
      calls.push("async-done");
    });

    await manager.emit("after-message", createHookContext());
    expect(calls).toEqual(["async-done"]);
  });

  it("ignores unmatched events", async () => {
    const calls: string[] = [];

    manager.register("before-message", () => {
      calls.push("matched");
    });

    await manager.emit("after-message", createHookContext());
    expect(calls).toHaveLength(0);
  });

  it("reports size correctly", () => {
    expect(manager.size).toBe(0);
    manager.register("before-message", () => {});
    expect(manager.size).toBe(1);
  });

  it("clears all hooks", () => {
    manager.register("before-message", () => {});
    manager.register("after-message", () => {});
    expect(manager.size).toBe(2);

    manager.clear();
    expect(manager.size).toBe(0);
  });

  it("getHandlers returns matching registrations", () => {
    manager.register("before-message", () => {});
    manager.register("after-message", () => {});
    manager.register(["before-message", "agent-error"], () => {});

    const handlers = manager.getHandlers("before-message");
    expect(handlers).toHaveLength(2);
  });
});
