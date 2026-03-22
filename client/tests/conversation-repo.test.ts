import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  initClientDatabase,
  getClientDatabase,
  closeClientDatabase,
} from "../src/db/client-db.js";
import { ConversationRepository } from "../src/db/repositories/conversation-repo.js";

/** Helper: insert a minimal agent so the foreign key on conversations is satisfied */
function insertAgent(id: string): void {
  const db = getClientDatabase();
  db.prepare(
    `
    INSERT INTO agents (id, name, description, agent_md, instructions_md, skills_md, tools_md)
    VALUES (?, ?, '', '', '', '', '')
  `,
  ).run(id, `Agent ${id}`);
}

describe("ConversationRepository", () => {
  let repo: ConversationRepository;

  beforeEach(() => {
    initClientDatabase(":memory:");
    repo = new ConversationRepository();
    insertAgent("agent-1");
    insertAgent("agent-2");
  });

  afterEach(() => {
    closeClientDatabase();
  });

  it("addMessage returns a generated id", () => {
    const id = repo.addMessage({
      agentId: "agent-1",
      role: "user",
      content: "Hello",
    });
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
  });

  it("addMessage and getHistory round-trip", () => {
    repo.addMessage({ agentId: "agent-1", role: "user", content: "Hi" });
    repo.addMessage({
      agentId: "agent-1",
      role: "assistant",
      content: "Hello!",
    });

    const history = repo.getHistory("agent-1");
    expect(history).toHaveLength(2);
    expect(history[0].role).toBe("user");
    expect(history[0].content).toBe("Hi");
    expect(history[1].role).toBe("assistant");
    expect(history[1].content).toBe("Hello!");
  });

  it("getHistory returns messages ordered by timestamp ASC", () => {
    repo.addMessage({ agentId: "agent-1", role: "user", content: "First" });
    repo.addMessage({
      agentId: "agent-1",
      role: "assistant",
      content: "Second",
    });
    repo.addMessage({ agentId: "agent-1", role: "user", content: "Third" });

    const history = repo.getHistory("agent-1");
    expect(history[0].content).toBe("First");
    expect(history[1].content).toBe("Second");
    expect(history[2].content).toBe("Third");
  });

  it("getHistory with limit returns at most N messages", () => {
    for (let i = 0; i < 10; i++) {
      repo.addMessage({
        agentId: "agent-1",
        role: "user",
        content: `Msg ${i}`,
      });
    }

    const limited = repo.getHistory("agent-1", 3);
    expect(limited).toHaveLength(3);
    // Ordered ASC with LIMIT, so we get the first 3
    expect(limited[0].content).toBe("Msg 0");
    expect(limited[1].content).toBe("Msg 1");
    expect(limited[2].content).toBe("Msg 2");
  });

  it("getHistory returns empty array for agent with no messages", () => {
    const history = repo.getHistory("agent-2");
    expect(history).toEqual([]);
  });

  it("getHistory only returns messages for the specified agent", () => {
    repo.addMessage({
      agentId: "agent-1",
      role: "user",
      content: "For agent 1",
    });
    repo.addMessage({
      agentId: "agent-2",
      role: "user",
      content: "For agent 2",
    });

    const h1 = repo.getHistory("agent-1");
    expect(h1).toHaveLength(1);
    expect(h1[0].content).toBe("For agent 1");

    const h2 = repo.getHistory("agent-2");
    expect(h2).toHaveLength(1);
    expect(h2[0].content).toBe("For agent 2");
  });

  it("clearHistory deletes all messages for the agent", () => {
    repo.addMessage({ agentId: "agent-1", role: "user", content: "A" });
    repo.addMessage({ agentId: "agent-1", role: "assistant", content: "B" });
    repo.addMessage({ agentId: "agent-2", role: "user", content: "C" });

    const deleted = repo.clearHistory("agent-1");
    expect(deleted).toBe(2);

    expect(repo.getHistory("agent-1")).toHaveLength(0);
    // agent-2 messages should be unaffected
    expect(repo.getHistory("agent-2")).toHaveLength(1);
  });

  it("clearHistory returns 0 when agent has no messages", () => {
    const deleted = repo.clearHistory("agent-2");
    expect(deleted).toBe(0);
  });

  it("stores contextId and token usage", () => {
    repo.addMessage({
      agentId: "agent-1",
      contextId: "ctx-42",
      role: "assistant",
      content: "Response",
      inputTokens: 200,
      outputTokens: 50,
    });

    const history = repo.getHistory("agent-1");
    expect(history[0].contextId).toBe("ctx-42");
    expect(history[0].inputTokens).toBe(200);
    expect(history[0].outputTokens).toBe(50);
  });

  it("defaults token counts to 0 when not provided", () => {
    repo.addMessage({ agentId: "agent-1", role: "user", content: "Hello" });

    const history = repo.getHistory("agent-1");
    expect(history[0].inputTokens).toBe(0);
    expect(history[0].outputTokens).toBe(0);
  });

  it("count returns the number of messages for an agent", () => {
    expect(repo.count("agent-1")).toBe(0);

    repo.addMessage({ agentId: "agent-1", role: "user", content: "1" });
    repo.addMessage({ agentId: "agent-1", role: "user", content: "2" });

    expect(repo.count("agent-1")).toBe(2);
    expect(repo.count("agent-2")).toBe(0);
  });
});
