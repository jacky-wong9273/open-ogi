import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  initClientDatabase,
  closeClientDatabase,
} from "../src/db/client-db.js";
import {
  AgentRepository,
  type LocalAgent,
} from "../src/db/repositories/agent-repo.js";

function makeAgentData(
  overrides?: Partial<Omit<LocalAgent, "id" | "createdAt" | "updatedAt">>,
): Omit<LocalAgent, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "Test Agent",
    description: "A test agent",
    agentMd: "# Test Agent",
    instructionsMd: "Follow instructions",
    skillsMd: "No skills",
    toolsMd: "No tools",
    styleMd: null,
    permittedSkills: ["code-review"],
    permittedTools: ["git-operations"],
    systemPromptOverride: null,
    environment: "development",
    isPublic: false,
    source: "local",
    serverId: null,
    ...overrides,
  };
}

describe("AgentRepository", () => {
  let repo: AgentRepository;

  beforeEach(() => {
    initClientDatabase(":memory:");
    repo = new AgentRepository();
  });

  afterEach(() => {
    closeClientDatabase();
  });

  it("creates an agent and verifies all fields", () => {
    const data = makeAgentData({
      name: "Developer",
      description: "Writes code",
      agentMd: "# Developer Agent",
      instructionsMd: "Write clean code",
      skillsMd: "code-review, bug-triage",
      toolsMd: "git-operations, code-analyzer",
      styleMd: "Be concise",
      permittedSkills: ["code-review", "bug-triage"],
      permittedTools: ["git-operations", "code-analyzer"],
      systemPromptOverride: "You are a developer",
      environment: "production",
      isPublic: true,
      source: "local",
      serverId: null,
    });

    const agent = repo.create(data);

    expect(agent.id).toBeTruthy();
    expect(agent.name).toBe("Developer");
    expect(agent.description).toBe("Writes code");
    expect(agent.agentMd).toBe("# Developer Agent");
    expect(agent.instructionsMd).toBe("Write clean code");
    expect(agent.skillsMd).toBe("code-review, bug-triage");
    expect(agent.toolsMd).toBe("git-operations, code-analyzer");
    expect(agent.styleMd).toBe("Be concise");
    expect(agent.permittedSkills).toEqual(["code-review", "bug-triage"]);
    expect(agent.permittedTools).toEqual(["git-operations", "code-analyzer"]);
    expect(agent.systemPromptOverride).toBe("You are a developer");
    expect(agent.environment).toBe("production");
    expect(agent.isPublic).toBe(true);
    expect(agent.source).toBe("local");
    expect(agent.serverId).toBeNull();
    expect(agent.createdAt).toBeTruthy();
    expect(agent.updatedAt).toBeTruthy();
  });

  it("lists all agents", () => {
    repo.create(makeAgentData({ name: "Agent A" }));
    repo.create(makeAgentData({ name: "Agent B" }));
    repo.create(makeAgentData({ name: "Agent C" }));

    const agents = repo.list();
    expect(agents).toHaveLength(3);
  });

  it("lists agents filtered by environment", () => {
    repo.create(
      makeAgentData({ name: "Dev Agent", environment: "development" }),
    );
    repo.create(
      makeAgentData({ name: "Prod Agent", environment: "production" }),
    );

    const devAgents = repo.list("development");
    expect(devAgents).toHaveLength(1);
    expect(devAgents[0].name).toBe("Dev Agent");

    const prodAgents = repo.list("production");
    expect(prodAgents).toHaveLength(1);
    expect(prodAgents[0].name).toBe("Prod Agent");
  });

  it("getById returns the agent for an existing id", () => {
    const created = repo.create(makeAgentData({ name: "Findable" }));
    const found = repo.getById(created.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.name).toBe("Findable");
  });

  it("getById returns null for a non-existing id", () => {
    const found = repo.getById("non-existent-id");
    expect(found).toBeNull();
  });

  it("updates agent fields", () => {
    const agent = repo.create(makeAgentData({ name: "Original" }));

    const updated = repo.update(agent.id, {
      name: "Updated",
      description: "New description",
      isPublic: true,
      permittedSkills: ["daily-standup"],
    });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Updated");
    expect(updated!.description).toBe("New description");
    expect(updated!.isPublic).toBe(true);
    expect(updated!.permittedSkills).toEqual(["daily-standup"]);
    // updatedAt should have changed
    expect(updated!.updatedAt).not.toBe(agent.createdAt);
  });

  it("update returns null for a non-existing id", () => {
    const result = repo.update("no-such-id", { name: "Nope" });
    expect(result).toBeNull();
  });

  it("update with no fields returns the existing agent unchanged", () => {
    const agent = repo.create(makeAgentData({ name: "Unchanged" }));
    const result = repo.update(agent.id, {});

    expect(result).not.toBeNull();
    expect(result!.name).toBe("Unchanged");
  });

  it("deletes an agent", () => {
    const agent = repo.create(makeAgentData({ name: "Deletable" }));
    const deleted = repo.delete(agent.id);

    expect(deleted).toBe(true);
    expect(repo.getById(agent.id)).toBeNull();
  });

  it("delete returns false for a non-existing id", () => {
    const deleted = repo.delete("no-such-id");
    expect(deleted).toBe(false);
  });

  it("getByServerId returns the agent with matching server_id", () => {
    repo.create(
      makeAgentData({
        name: "Server Agent",
        source: "server",
        serverId: "srv-123",
      }),
    );

    const found = repo.getByServerId("srv-123");
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Server Agent");
    expect(found!.serverId).toBe("srv-123");
  });

  it("getByServerId returns null for unknown server id", () => {
    const found = repo.getByServerId("nonexistent-server-id");
    expect(found).toBeNull();
  });

  it("correctly stores and retrieves agents with source 'local' vs 'server'", () => {
    repo.create(makeAgentData({ name: "Local Agent", source: "local" }));
    repo.create(
      makeAgentData({
        name: "Server Agent A",
        source: "server",
        serverId: "srv-a",
      }),
    );
    repo.create(
      makeAgentData({
        name: "Server Agent B",
        source: "server",
        serverId: "srv-b",
      }),
    );

    const all = repo.list();
    const localAgents = all.filter((a) => a.source === "local");
    const serverAgents = all.filter((a) => a.source === "server");

    expect(localAgents).toHaveLength(1);
    expect(localAgents[0].name).toBe("Local Agent");

    expect(serverAgents).toHaveLength(2);
    expect(serverAgents.map((a) => a.name).sort()).toEqual([
      "Server Agent A",
      "Server Agent B",
    ]);
  });
});
