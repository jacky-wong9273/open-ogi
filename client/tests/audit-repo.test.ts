import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  initClientDatabase,
  closeClientDatabase,
} from "../src/db/client-db.js";
import { AuditRepository } from "../src/db/repositories/audit-repo.js";

describe("AuditRepository", () => {
  let repo: AuditRepository;

  beforeEach(() => {
    initClientDatabase(":memory:");
    repo = new AuditRepository();
  });

  afterEach(() => {
    closeClientDatabase();
  });

  it("appends an entry and retrieves it", () => {
    repo.append({
      agentId: "agent-1",
      action: "agent_started",
      details: "Agent booted up",
    });

    const entries = repo.query();
    expect(entries).toHaveLength(1);
    expect(entries[0].agentId).toBe("agent-1");
    expect(entries[0].action).toBe("agent_started");
    expect(entries[0].details).toBe("Agent booted up");
    expect(entries[0].id).toBeTruthy();
    expect(entries[0].timestamp).toBeTruthy();
  });

  it("appends entries with all optional fields", () => {
    repo.append({
      agentId: "agent-2",
      action: "tool_invoked",
      details: "Invoked git-operations",
      contextId: "ctx-100",
      parentAgentId: "agent-1",
      inputTokens: 150,
      outputTokens: 75,
    });

    const entries = repo.query();
    expect(entries).toHaveLength(1);
    expect(entries[0].contextId).toBe("ctx-100");
    expect(entries[0].parentAgentId).toBe("agent-1");
    expect(entries[0].inputTokens).toBe(150);
    expect(entries[0].outputTokens).toBe(75);
  });

  it("defaults optional numeric fields to 0", () => {
    repo.append({
      agentId: "agent-1",
      action: "agent_started",
      details: "Started",
    });

    const entries = repo.query();
    expect(entries[0].inputTokens).toBe(0);
    expect(entries[0].outputTokens).toBe(0);
  });

  it("query with limit returns the specified number of entries", () => {
    for (let i = 0; i < 10; i++) {
      repo.append({
        agentId: "agent-1",
        action: "message_sent",
        details: `Message ${i}`,
      });
    }

    const limited = repo.query({ limit: 3 });
    expect(limited).toHaveLength(3);
  });

  it("query returns newest entries first (ORDER BY id DESC)", () => {
    repo.append({
      agentId: "agent-1",
      action: "agent_started",
      details: "First",
    });
    repo.append({
      agentId: "agent-1",
      action: "skill_invoked",
      details: "Second",
    });
    repo.append({
      agentId: "agent-1",
      action: "agent_stopped",
      details: "Third",
    });

    const entries = repo.query();
    // Newest first: Third, Second, First
    expect(entries[0].details).toBe("Third");
    expect(entries[1].details).toBe("Second");
    expect(entries[2].details).toBe("First");
  });

  it("query filters by agentId", () => {
    repo.append({
      agentId: "agent-1",
      action: "agent_started",
      details: "A1 started",
    });
    repo.append({
      agentId: "agent-2",
      action: "agent_started",
      details: "A2 started",
    });
    repo.append({
      agentId: "agent-1",
      action: "agent_stopped",
      details: "A1 stopped",
    });

    const agent1Entries = repo.query({ agentId: "agent-1" });
    expect(agent1Entries).toHaveLength(2);
    expect(agent1Entries.every((e) => e.agentId === "agent-1")).toBe(true);
  });

  it("query filters by action", () => {
    repo.append({
      agentId: "agent-1",
      action: "agent_started",
      details: "Started",
    });
    repo.append({
      agentId: "agent-1",
      action: "error",
      details: "Something failed",
    });
    repo.append({
      agentId: "agent-1",
      action: "agent_started",
      details: "Restarted",
    });

    const errorEntries = repo.query({ action: "error" });
    expect(errorEntries).toHaveLength(1);
    expect(errorEntries[0].details).toBe("Something failed");
  });

  it("count returns the total number of entries", () => {
    expect(repo.count()).toBe(0);

    repo.append({ agentId: "a", action: "agent_started", details: "1" });
    repo.append({ agentId: "b", action: "agent_started", details: "2" });
    repo.append({ agentId: "c", action: "agent_started", details: "3" });

    expect(repo.count()).toBe(3);
  });

  it("entries are append-only (no update or delete methods exist)", () => {
    // Verify the repository API does not expose update or delete methods
    const repoProto = Object.getOwnPropertyNames(Object.getPrototypeOf(repo));
    expect(repoProto).not.toContain("update");
    expect(repoProto).not.toContain("delete");
  });

  it("query with offset skips entries", () => {
    for (let i = 0; i < 5; i++) {
      repo.append({
        agentId: "agent-1",
        action: "message_sent",
        details: `Msg ${i}`,
      });
    }

    // With offset=2, limit=2, we skip the first 2 of the DESC-ordered results
    const entries = repo.query({ offset: 2, limit: 2 });
    expect(entries).toHaveLength(2);
    // ids are descending: 5,4,3,2,1 -> skip 5,4 -> get 3,2
    expect(entries[0].details).toBe("Msg 2");
    expect(entries[1].details).toBe("Msg 1");
  });
});
