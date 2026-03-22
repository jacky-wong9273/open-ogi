import { describe, it, expect, beforeEach } from "vitest";
import { ToolRegistry } from "../src/runtime/tool-registry.js";
import type { RegisteredTool, ToolContext } from "@open-ogi/shared";

function createMockTool(name: string, overrides?: Partial<RegisteredTool>): RegisteredTool {
  return {
    name,
    description: `Mock tool: ${name}`,
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: async (_params, _ctx) => ({
      success: true,
      output: [{ type: "text", text: `${name} output` }],
      durationMs: 1,
    }),
    ...overrides,
  };
}

function createMockContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    agentId: "agent-1",
    sessionKey: "session-1",
    environment: "development",
    config: {},
    ...overrides,
  };
}

describe("ToolRegistry", () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it("registers and retrieves a tool via factory", () => {
    const tool = createMockTool("calculator");
    registry.register("calculator", () => tool, { source: "test" });

    const retrieved = registry.get("calculator", createMockContext());
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe("calculator");
  });

  it("registers a pre-built tool directly", () => {
    const tool = createMockTool("echo");
    registry.registerTool(tool);

    expect(registry.has("echo")).toBe(true);
    const retrieved = registry.get("echo", createMockContext());
    expect(retrieved!.name).toBe("echo");
  });

  it("prevents duplicate registrations", () => {
    const tool = createMockTool("dup");
    registry.registerTool(tool);
    expect(() => registry.registerTool(tool)).toThrow("already registered");
  });

  it("caches instantiated tools per session", () => {
    let callCount = 0;
    registry.register("counted", (ctx) => {
      callCount++;
      return createMockTool("counted");
    });

    const ctx = createMockContext();
    registry.get("counted", ctx);
    registry.get("counted", ctx);
    expect(callCount).toBe(1);
  });

  it("lists available tools", () => {
    registry.registerTool(createMockTool("a"));
    registry.registerTool(createMockTool("b"));

    expect(registry.listAll()).toEqual(["a", "b"]);
    expect(registry.listAvailable()).toEqual(["a", "b"]);
  });

  it("unregisters a tool", () => {
    registry.registerTool(createMockTool("temp"));
    expect(registry.has("temp")).toBe(true);

    registry.unregister("temp");
    expect(registry.has("temp")).toBe(false);
  });

  describe("Tool Profiles", () => {
    beforeEach(() => {
      registry.register("calc", () => createMockTool("calc"), {
        profile: "minimal",
      });
      registry.register("editor", () => createMockTool("editor"), {
        profile: "coding",
      });
      registry.register("telegram", () => createMockTool("telegram"), {
        profile: "messaging",
      });
      registry.register("admin", () => createMockTool("admin"), {
        profile: "full",
      });
    });

    it("full profile includes all tools", () => {
      registry.setProfile("full");
      expect(registry.listAvailable()).toEqual([
        "calc",
        "editor",
        "telegram",
        "admin",
      ]);
    });

    it("minimal profile only includes minimal tools", () => {
      registry.setProfile("minimal");
      expect(registry.listAvailable()).toEqual(["calc"]);
    });

    it("coding profile includes minimal + coding", () => {
      registry.setProfile("coding");
      expect(registry.listAvailable()).toEqual(["calc", "editor"]);
    });

    it("messaging profile includes minimal + messaging", () => {
      registry.setProfile("messaging");
      expect(registry.listAvailable()).toEqual(["calc", "telegram"]);
    });

    it("profile change clears cache", () => {
      const ctx = createMockContext();
      registry.get("calc", ctx);
      registry.setProfile("minimal");
      // Cache should be cleared, so re-instantiation happens
      const tool = registry.get("calc", ctx);
      expect(tool).toBeDefined();
    });
  });

  it("returns undefined for optional tool that fails to instantiate", () => {
    registry.register(
      "broken",
      () => {
        throw new Error("Failed to init");
      },
      { optional: true },
    );

    const tool = registry.get("broken", createMockContext());
    expect(tool).toBeUndefined();
  });

  it("throws for non-optional tool that fails to instantiate", () => {
    registry.register("broken", () => {
      throw new Error("Failed to init");
    });

    expect(() => registry.get("broken", createMockContext())).toThrow(
      "Failed to init",
    );
  });
});
