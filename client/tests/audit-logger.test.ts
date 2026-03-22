import { describe, it, expect, beforeEach } from "vitest";
import { AuditLogger } from "../src/runtime/audit-logger.js";

describe("AuditLogger", () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger("agent-1");
  });

  it("starts with zero entries", () => {
    expect(logger.length).toBe(0);
    expect(logger.getEntries()).toEqual([]);
  });

  it("logs an entry", () => {
    logger.log("agent_started", "Agent started");
    expect(logger.length).toBe(1);
    const entry = logger.getEntries()[0];
    expect(entry.agentId).toBe("agent-1");
    expect(entry.action).toBe("agent_started");
    expect(entry.details).toBe("Agent started");
    expect(entry.timestamp).toBeTruthy();
  });

  it("logs with options", () => {
    logger.log("skill_invoked", "Invoked code-review", {
      contextId: "ctx-1",
      parentAgentId: "parent-1",
      tokenUsage: { input: 100, output: 50 },
    });

    const entry = logger.getEntries()[0];
    expect(entry.contextId).toBe("ctx-1");
    expect(entry.parentAgentId).toBe("parent-1");
    expect(entry.tokenUsage).toEqual({ input: 100, output: 50 });
  });

  it("appends entries in order", () => {
    logger.log("agent_started", "First");
    logger.log("skill_invoked", "Second");
    logger.log("agent_stopped", "Third");

    const entries = logger.getEntries();
    expect(entries).toHaveLength(3);
    expect(entries[0].details).toBe("First");
    expect(entries[1].details).toBe("Second");
    expect(entries[2].details).toBe("Third");
  });

  it("getNewEntries returns entries after given index", () => {
    logger.log("agent_started", "One");
    logger.log("skill_invoked", "Two");
    logger.log("agent_stopped", "Three");

    const newEntries = logger.getNewEntries(1);
    expect(newEntries).toHaveLength(2);
    expect(newEntries[0].details).toBe("Two");
  });

  it("getEntries returns a copy", () => {
    logger.log("agent_started", "Test");
    const entries = logger.getEntries();
    entries.pop();
    expect(logger.length).toBe(1);
  });

  describe("toMarkdown", () => {
    it("generates markdown with header", () => {
      const md = logger.toMarkdown();
      expect(md).toContain("# Audit Log");
      expect(md).toContain("| Timestamp |");
    });

    it("includes entries in markdown", () => {
      logger.log("agent_started", "Agent booted up");
      const md = logger.toMarkdown();
      expect(md).toContain("agent_started");
      expect(md).toContain("agent-1");
      expect(md).toContain("Agent booted up");
    });
  });
});
