import { describe, it, expect, beforeEach } from "vitest";
import { AgentLabService } from "../src/services/agent-lab.js";
import { initDatabase, closeDatabase } from "../src/db/index.js";
import type { AppDatabase } from "../src/db/index.js";

function makeAgentData(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Agent",
    description: "A test agent",
    agentMd: "# Agent",
    instructionsMd: "# Instructions",
    skillsMd: "# Skills",
    toolsMd: "# Tools",
    styleMd: "# Style",
    permittedSkills: ["skill-1"],
    permittedTools: ["tool-1"],
    environment: "development",
    isPublic: false,
    createdBy: "user-1",
    ...overrides,
  };
}

describe("AgentLabService", () => {
  let db: AppDatabase;
  let service: AgentLabService;

  beforeEach(() => {
    closeDatabase();
    db = initDatabase(":memory:");
    service = new AgentLabService(db);
  });

  describe("create", () => {
    it("creates an agent and returns it with all fields", async () => {
      const agent = await service.create(makeAgentData());

      expect(agent.id).toBeTruthy();
      expect(agent.name).toBe("Test Agent");
      expect(agent.description).toBe("A test agent");
      expect(agent.agentMd).toBe("# Agent");
      expect(agent.instructionsMd).toBe("# Instructions");
      expect(agent.skillsMd).toBe("# Skills");
      expect(agent.toolsMd).toBe("# Tools");
      expect(agent.styleMd).toBe("# Style");
      expect(agent.permittedSkills).toEqual(["skill-1"]);
      expect(agent.permittedTools).toEqual(["tool-1"]);
      expect(agent.environment).toBe("development");
      expect(agent.isPublic).toBe(false);
      expect(agent.createdBy).toBe("user-1");
      expect(agent.createdAt).toBeTruthy();
      expect(agent.updatedAt).toBeTruthy();
      expect(agent.references).toEqual([]);
    });

    it("creates an agent without optional fields", async () => {
      const agent = await service.create(
        makeAgentData({ styleMd: undefined, systemPromptOverride: undefined }),
      );

      expect(agent.id).toBeTruthy();
      expect(agent.name).toBe("Test Agent");
      // styleMd is set to "" when undefined per the service code
      expect(agent.systemPromptOverride).toBeUndefined();
    });

    it("creates multiple agents and assigns unique ids", async () => {
      const a1 = await service.create(makeAgentData({ name: "Agent 1" }));
      const a2 = await service.create(makeAgentData({ name: "Agent 2" }));

      expect(a1.id).not.toBe(a2.id);
      expect(a1.name).toBe("Agent 1");
      expect(a2.name).toBe("Agent 2");
    });
  });

  describe("getById", () => {
    it("returns the agent for an existing id", async () => {
      const created = await service.create(makeAgentData());
      const found = await service.getById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe("Test Agent");
    });

    it("returns null for a non-existing id", async () => {
      const found = await service.getById("non-existent-id");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("returns all agents when no filters are provided", async () => {
      await service.create(makeAgentData({ name: "Agent A" }));
      await service.create(makeAgentData({ name: "Agent B" }));

      const agents = await service.list();
      expect(agents).toHaveLength(2);
    });

    it("filters by environment", async () => {
      await service.create(
        makeAgentData({ name: "Dev Agent", environment: "development" }),
      );
      await service.create(
        makeAgentData({ name: "Prod Agent", environment: "production" }),
      );

      const devAgents = await service.list({ environment: "development" });
      expect(devAgents).toHaveLength(1);
      expect(devAgents[0].name).toBe("Dev Agent");

      const prodAgents = await service.list({ environment: "production" });
      expect(prodAgents).toHaveLength(1);
      expect(prodAgents[0].name).toBe("Prod Agent");
    });

    it("filters by createdBy and includes public agents", async () => {
      await service.create(
        makeAgentData({
          name: "Private A",
          createdBy: "user-1",
          isPublic: false,
        }),
      );
      await service.create(
        makeAgentData({
          name: "Private B",
          createdBy: "user-2",
          isPublic: false,
        }),
      );
      await service.create(
        makeAgentData({
          name: "Public C",
          createdBy: "user-2",
          isPublic: true,
        }),
      );

      // createdBy filter returns agents owned by user-1 OR public agents
      const result = await service.list({ createdBy: "user-1" });
      const names = result.map((a) => a.name);
      expect(names).toContain("Private A");
      expect(names).toContain("Public C");
      expect(names).not.toContain("Private B");
    });

    it("filters by isPublic", async () => {
      await service.create(makeAgentData({ name: "Private", isPublic: false }));
      await service.create(makeAgentData({ name: "Public", isPublic: true }));

      const publicAgents = await service.list({ isPublic: true });
      expect(publicAgents).toHaveLength(1);
      expect(publicAgents[0].name).toBe("Public");
    });

    it("returns agents ordered by updatedAt descending", async () => {
      const a1 = await service.create(makeAgentData({ name: "First" }));
      const a2 = await service.create(makeAgentData({ name: "Second" }));

      // Update the first agent so it has a newer updatedAt
      await service.update(a1.id, { name: "First Updated" });

      const agents = await service.list();
      expect(agents[0].name).toBe("First Updated");
      expect(agents[1].name).toBe("Second");
    });

    it("returns empty array when no agents match", async () => {
      const agents = await service.list({ environment: "staging" });
      expect(agents).toEqual([]);
    });
  });

  describe("update", () => {
    it("updates an agent name and description", async () => {
      const created = await service.create(makeAgentData());
      const updated = await service.update(created.id, {
        name: "Updated Name",
        description: "Updated description",
      });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("Updated Name");
      expect(updated!.description).toBe("Updated description");
      // Other fields remain unchanged
      expect(updated!.agentMd).toBe("# Agent");
    });

    it("updates permittedSkills and permittedTools", async () => {
      const created = await service.create(makeAgentData());
      const updated = await service.update(created.id, {
        permittedSkills: ["skill-a", "skill-b"],
        permittedTools: ["tool-x"],
      });

      expect(updated!.permittedSkills).toEqual(["skill-a", "skill-b"]);
      expect(updated!.permittedTools).toEqual(["tool-x"]);
    });

    it("returns null when updating a non-existing agent", async () => {
      const result = await service.update("non-existent-id", { name: "Nope" });
      expect(result).toBeNull();
    });

    it("returns the agent unchanged when no update fields are provided", async () => {
      const created = await service.create(makeAgentData());
      const updated = await service.update(created.id, {});

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe(created.name);
    });

    it("updates the updatedAt timestamp", async () => {
      const created = await service.create(makeAgentData());
      const updated = await service.update(created.id, { name: "New Name" });

      expect(updated!.updatedAt).not.toBe(created.updatedAt);
    });
  });

  describe("delete", () => {
    it("deletes an existing agent and returns true", async () => {
      const created = await service.create(makeAgentData());
      const deleted = await service.delete(created.id);

      expect(deleted).toBe(true);

      const found = await service.getById(created.id);
      expect(found).toBeNull();
    });

    it("returns false when deleting a non-existing agent", async () => {
      const deleted = await service.delete("non-existent-id");
      expect(deleted).toBe(false);
    });

    it("removes the agent from list results", async () => {
      const a1 = await service.create(makeAgentData({ name: "Keep" }));
      const a2 = await service.create(makeAgentData({ name: "Delete" }));

      await service.delete(a2.id);

      const agents = await service.list();
      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe("Keep");
    });
  });

  describe("count verification", () => {
    it("creates multiple agents and verifies the count", async () => {
      const count = 5;
      for (let i = 0; i < count; i++) {
        await service.create(makeAgentData({ name: `Agent ${i}` }));
      }

      const agents = await service.list();
      expect(agents).toHaveLength(count);
    });
  });

  describe("references", () => {
    it("adds a reference to an agent", async () => {
      const agent = await service.create(makeAgentData());
      const ref = await service.addReference(
        agent.id,
        "readme.md",
        "# README",
        "ctx-1",
      );

      expect(ref.id).toBeTruthy();
      expect(ref.filename).toBe("readme.md");
      expect(ref.content).toBe("# README");
      expect(ref.contextId).toBe("ctx-1");
    });

    it("retrieves references for an agent", async () => {
      const agent = await service.create(makeAgentData());
      await service.addReference(agent.id, "file1.md", "content1", "ctx-1");
      await service.addReference(agent.id, "file2.md", "content2", "ctx-2");

      const refs = await service.getReferences(agent.id);
      expect(refs).toHaveLength(2);
    });

    it("includes references when getting agent by id", async () => {
      const agent = await service.create(makeAgentData());
      await service.addReference(agent.id, "ref.md", "ref content", "ctx-1");

      const fetched = await service.getById(agent.id);
      expect(fetched!.references).toHaveLength(1);
      expect(fetched!.references[0].filename).toBe("ref.md");
    });

    it("updates a reference content", async () => {
      const agent = await service.create(makeAgentData());
      const ref = await service.addReference(
        agent.id,
        "doc.md",
        "old",
        "ctx-1",
      );

      await service.updateReference(ref.id, "new content");

      const refs = await service.getReferences(agent.id);
      expect(refs[0].content).toBe("new content");
    });

    it("deletes a reference", async () => {
      const agent = await service.create(makeAgentData());
      const ref = await service.addReference(
        agent.id,
        "doc.md",
        "content",
        "ctx-1",
      );

      await service.deleteReference(ref.id);

      const refs = await service.getReferences(agent.id);
      expect(refs).toHaveLength(0);
    });
  });
});
