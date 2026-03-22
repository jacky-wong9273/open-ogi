import { describe, it, expect, beforeEach } from "vitest";
import { AuditService } from "../src/services/audit.js";
import { initDatabase, closeDatabase } from "../src/db/index.js";
import type { AppDatabase } from "../src/db/index.js";

describe("AuditService", () => {
  let db: AppDatabase;
  let service: AuditService;

  beforeEach(() => {
    closeDatabase();
    db = initDatabase(":memory:");
    service = new AuditService(db);
  });

  describe("log", () => {
    it("logs an audit entry with required fields", async () => {
      await service.log({
        agentId: "agent-1",
        action: "tool_call",
        details: "Called search tool",
      });

      const { entries, total } = await service.getEntries();
      expect(total).toBe(1);
      expect(entries).toHaveLength(1);
      expect(entries[0].agentId).toBe("agent-1");
      expect(entries[0].action).toBe("tool_call");
      expect(entries[0].details).toBe("Called search tool");
    });

    it("logs an audit entry with all optional fields", async () => {
      await service.log({
        agentId: "agent-1",
        userId: "user-1",
        action: "agent_spawn",
        details: "Spawned sub-agent",
        contextId: "ctx-1",
        parentAgentId: "parent-1",
        inputTokens: 100,
        outputTokens: 50,
        ipAddress: "127.0.0.1",
        resourceType: "agent",
        resourceId: "res-1",
      });

      const { entries } = await service.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].agentId).toBe("agent-1");
      expect(entries[0].action).toBe("agent_spawn");
      expect(entries[0].contextId).toBe("ctx-1");
      expect(entries[0].parentAgentId).toBe("parent-1");
      expect(entries[0].tokenUsage).toEqual({ input: 100, output: 50 });
    });

    it("logs multiple entries", async () => {
      await service.log({
        agentId: "agent-1",
        action: "action_1",
        details: "d1",
      });
      await service.log({
        agentId: "agent-2",
        action: "action_2",
        details: "d2",
      });
      await service.log({
        agentId: "agent-1",
        action: "action_3",
        details: "d3",
      });

      const { total } = await service.getEntries();
      expect(total).toBe(3);
    });

    it("sets tokenUsage to undefined when no tokens are provided", async () => {
      await service.log({
        agentId: "agent-1",
        action: "test",
        details: "no tokens",
      });

      const { entries } = await service.getEntries();
      expect(entries[0].tokenUsage).toBeUndefined();
    });
  });

  describe("getEntries", () => {
    it("returns entries with pagination using limit and offset", async () => {
      for (let i = 0; i < 10; i++) {
        await service.log({
          agentId: "agent-1",
          action: "action",
          details: `entry ${i}`,
        });
      }

      const page1 = await service.getEntries({ limit: 3, offset: 0 });
      expect(page1.entries).toHaveLength(3);
      expect(page1.total).toBe(10);

      const page2 = await service.getEntries({ limit: 3, offset: 3 });
      expect(page2.entries).toHaveLength(3);
      expect(page2.total).toBe(10);

      // Last page with remaining entries
      const page4 = await service.getEntries({ limit: 3, offset: 9 });
      expect(page4.entries).toHaveLength(1);
      expect(page4.total).toBe(10);
    });

    it("filters entries by agentId", async () => {
      await service.log({ agentId: "agent-1", action: "a", details: "d1" });
      await service.log({ agentId: "agent-2", action: "b", details: "d2" });
      await service.log({ agentId: "agent-1", action: "c", details: "d3" });

      const { entries, total } = await service.getEntries({
        agentId: "agent-1",
      });
      expect(total).toBe(2);
      expect(entries).toHaveLength(2);
      entries.forEach((e) => expect(e.agentId).toBe("agent-1"));
    });

    it("filters entries by action", async () => {
      await service.log({
        agentId: "agent-1",
        action: "tool_call",
        details: "d1",
      });
      await service.log({
        agentId: "agent-1",
        action: "agent_spawn",
        details: "d2",
      });
      await service.log({
        agentId: "agent-2",
        action: "tool_call",
        details: "d3",
      });

      const { entries, total } = await service.getEntries({
        action: "tool_call",
      });
      expect(total).toBe(2);
      expect(entries).toHaveLength(2);
      entries.forEach((e) => expect(e.action).toBe("tool_call"));
    });

    it("combines agentId and action filters", async () => {
      await service.log({
        agentId: "agent-1",
        action: "tool_call",
        details: "d1",
      });
      await service.log({
        agentId: "agent-1",
        action: "agent_spawn",
        details: "d2",
      });
      await service.log({
        agentId: "agent-2",
        action: "tool_call",
        details: "d3",
      });

      const { entries, total } = await service.getEntries({
        agentId: "agent-1",
        action: "tool_call",
      });
      expect(total).toBe(1);
      expect(entries).toHaveLength(1);
      expect(entries[0].agentId).toBe("agent-1");
      expect(entries[0].action).toBe("tool_call");
    });

    it("returns entries ordered by timestamp descending", async () => {
      await service.log({ agentId: "agent-1", action: "first", details: "d1" });
      await service.log({
        agentId: "agent-1",
        action: "second",
        details: "d2",
      });
      await service.log({ agentId: "agent-1", action: "third", details: "d3" });

      const { entries } = await service.getEntries();
      // Since all entries are inserted in quick succession, timestamps may be identical.
      // But the order should at least be consistent (desc by timestamp).
      expect(entries).toHaveLength(3);
      for (let i = 0; i < entries.length - 1; i++) {
        expect(entries[i].timestamp >= entries[i + 1].timestamp).toBe(true);
      }
    });

    it("returns empty results when no entries exist", async () => {
      const { entries, total } = await service.getEntries();
      expect(entries).toEqual([]);
      expect(total).toBe(0);
    });

    it("returns empty results when filters match nothing", async () => {
      await service.log({ agentId: "agent-1", action: "test", details: "d" });

      const { entries, total } = await service.getEntries({
        agentId: "non-existent",
      });
      expect(entries).toEqual([]);
      expect(total).toBe(0);
    });

    it("returns all entries when limit is not specified", async () => {
      for (let i = 0; i < 5; i++) {
        await service.log({
          agentId: "agent-1",
          action: "a",
          details: `d${i}`,
        });
      }

      const { entries, total } = await service.getEntries();
      expect(entries).toHaveLength(5);
      expect(total).toBe(5);
    });
  });

  describe("append-only behavior", () => {
    it("has no delete or update methods on entries", () => {
      // Verify AuditService does not expose delete/update methods for audit entries.
      // The only mutation method is 'log' (append).
      expect(typeof service.log).toBe("function");
      expect(typeof service.getEntries).toBe("function");
      expect(typeof service.generateAgentAuditMd).toBe("function");
      // These should not exist
      expect((service as Record<string, unknown>).deleteEntry).toBeUndefined();
      expect((service as Record<string, unknown>).updateEntry).toBeUndefined();
      expect((service as Record<string, unknown>).delete).toBeUndefined();
      expect((service as Record<string, unknown>).update).toBeUndefined();
    });
  });

  describe("generateAgentAuditMd", () => {
    it("generates markdown for an agent audit log", async () => {
      await service.log({
        agentId: "agent-1",
        action: "tool_call",
        details: "Used search",
      });
      await service.log({
        agentId: "agent-1",
        action: "agent_spawn",
        details: "Spawned child",
      });

      const md = await service.generateAgentAuditMd("agent-1");

      expect(md).toContain("# Audit Log");
      expect(md).toContain("agent-1");
      expect(md).toContain("tool_call");
      expect(md).toContain("agent_spawn");
      expect(md).toContain("Used search");
      expect(md).toContain("Spawned child");
    });

    it("returns a header-only markdown for an agent with no entries", async () => {
      const md = await service.generateAgentAuditMd("agent-1");

      expect(md).toContain("# Audit Log");
      expect(md).toContain("agent-1");
      // Should have the table header but no data rows
      expect(md).toContain("Timestamp");
      expect(md).toContain("Action");
      expect(md).toContain("Details");
    });
  });
});
