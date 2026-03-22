import { describe, it, expect, beforeEach } from "vitest";
import { TokenTrackerService } from "../src/services/token-tracker.js";
import { initDatabase } from "../src/db/index.js";
import type { AppDatabase } from "../src/db/index.js";
import { realizedAgents } from "../src/db/schema.js";

describe("TokenTrackerService", () => {
  let db: AppDatabase;
  let service: TokenTrackerService;

  beforeEach(() => {
    db = initDatabase(":memory:");
    service = new TokenTrackerService(db);
    // Seed a realized agent
    db.insert(realizedAgents)
      .values({
        id: "agent-1",
        abstractAgentId: "abstract-1",
        name: "Test Agent",
        status: "running",
        clientId: "test-client",
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
      })
      .run();
  });

  describe("record", () => {
    it("records token usage and returns a record", async () => {
      const record = await service.record({
        agentId: "agent-1",
        contextId: "ctx-1",
        inputTokens: 100,
        outputTokens: 50,
        model: "deepseek-chat",
        provider: "deepseek",
        type: "agent",
      });

      expect(record.id).toBeTruthy();
      expect(record.agentId).toBe("agent-1");
      expect(record.inputTokens).toBe(100);
      expect(record.outputTokens).toBe(50);
      expect(record.totalTokens).toBe(150);
      expect(record.estimatedCost).toBeGreaterThanOrEqual(0);
    });

    it("updates realized agent totals", async () => {
      await service.record({
        agentId: "agent-1",
        contextId: "ctx-1",
        inputTokens: 1000,
        outputTokens: 500,
        model: "deepseek-chat",
        provider: "deepseek",
        type: "agent",
      });

      const agent = db.select().from(realizedAgents).get();
      expect(agent!.totalInputTokens).toBe(1000);
      expect(agent!.totalOutputTokens).toBe(500);
    });
  });

  describe("getReport", () => {
    it("returns aggregated report", async () => {
      await service.record({
        agentId: "agent-1",
        contextId: "ctx-1",
        inputTokens: 100,
        outputTokens: 50,
        model: "deepseek-chat",
        provider: "deepseek",
        type: "agent",
      });

      const report = await service.getReport("2020-01-01", "2030-01-01");
      expect(report.totalTokens).toBe(150);
      expect(report.totalCost).toBeGreaterThanOrEqual(0);
      expect(report.byAgent).toHaveLength(1);
      expect(report.byAgent[0].entityId).toBe("agent-1");
    });

    it("returns empty report for no data in range", async () => {
      const report = await service.getReport("2020-01-01", "2020-01-02");
      expect(report.totalTokens).toBe(0);
      expect(report.totalCost).toBe(0);
      expect(report.byAgent).toHaveLength(0);
    });
  });
});
