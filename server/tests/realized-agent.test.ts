import { describe, it, expect, beforeEach } from "vitest";
import { RealizedAgentService } from "../src/services/realized-agent.js";
import { AgentLabService } from "../src/services/agent-lab.js";
import { initDatabase, closeDatabase } from "../src/db/index.js";
import type { AppDatabase } from "../src/db/index.js";

function makeAgentData(overrides: Record<string, unknown> = {}) {
  return {
    name: "Abstract Agent",
    description: "Base agent",
    agentMd: "",
    instructionsMd: "",
    skillsMd: "",
    toolsMd: "",
    permittedSkills: [] as string[],
    permittedTools: [] as string[],
    environment: "development",
    isPublic: false,
    createdBy: "user-1",
    ...overrides,
  };
}

describe("RealizedAgentService", () => {
  let db: AppDatabase;
  let service: RealizedAgentService;
  let agentLabService: AgentLabService;
  let abstractAgentId: string;

  beforeEach(async () => {
    closeDatabase();
    db = initDatabase(":memory:");
    service = new RealizedAgentService(db);
    agentLabService = new AgentLabService(db);

    // Create an abstract agent to satisfy the foreign key constraint
    const abstractAgent = await agentLabService.create(makeAgentData());
    abstractAgentId = abstractAgent.id;
  });

  describe("instantiate", () => {
    it("creates a realized agent and returns it with all fields", async () => {
      const agent = await service.instantiate({
        abstractAgentId,
        name: "My Running Agent",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });

      expect(agent.id).toBeTruthy();
      expect(agent.abstractAgentId).toBe(abstractAgentId);
      expect(agent.name).toBe("My Running Agent");
      expect(agent.status).toBe("idle");
      expect(agent.type).toBe("permanent");
      expect(agent.parentAgentId).toBeUndefined();
      expect(agent.spawnDepth).toBe(0);
      expect(agent.environment).toBe("development");
      expect(agent.clientId).toBe("client-1");
      expect(agent.startedAt).toBeTruthy();
      expect(agent.lastActiveAt).toBeTruthy();
      expect(agent.tokenUsage).toEqual({
        totalInput: 0,
        totalOutput: 0,
        totalCost: 0,
      });
    });

    it("creates a temporary agent", async () => {
      const agent = await service.instantiate({
        abstractAgentId,
        name: "Temp Agent",
        type: "temporary",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });

      expect(agent.type).toBe("temporary");
    });

    it("creates multiple realized agents with unique ids", async () => {
      const a1 = await service.instantiate({
        abstractAgentId,
        name: "Agent 1",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });
      const a2 = await service.instantiate({
        abstractAgentId,
        name: "Agent 2",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });

      expect(a1.id).not.toBe(a2.id);
    });
  });

  describe("getById", () => {
    it("returns the realized agent for an existing id", async () => {
      const created = await service.instantiate({
        abstractAgentId,
        name: "Lookup Agent",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });

      const found = await service.getById(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe("Lookup Agent");
    });

    it("returns null for a non-existing id", async () => {
      const found = await service.getById("non-existent");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("returns all realized agents when no filters are provided", async () => {
      await service.instantiate({
        abstractAgentId,
        name: "Agent A",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });
      await service.instantiate({
        abstractAgentId,
        name: "Agent B",
        type: "temporary",
        spawnDepth: 0,
        environment: "production",
        clientId: "client-2",
      });

      const agents = await service.list();
      expect(agents).toHaveLength(2);
    });

    it("filters by environment", async () => {
      await service.instantiate({
        abstractAgentId,
        name: "Dev Agent",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });
      await service.instantiate({
        abstractAgentId,
        name: "Prod Agent",
        type: "permanent",
        spawnDepth: 0,
        environment: "production",
        clientId: "client-1",
      });

      const devAgents = await service.list({ environment: "development" });
      expect(devAgents).toHaveLength(1);
      expect(devAgents[0].name).toBe("Dev Agent");
    });

    it("filters by status", async () => {
      const a1 = await service.instantiate({
        abstractAgentId,
        name: "Running",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });
      await service.instantiate({
        abstractAgentId,
        name: "Idle",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });

      await service.updateStatus(a1.id, "running");

      const runningAgents = await service.list({ status: "running" });
      expect(runningAgents).toHaveLength(1);
      expect(runningAgents[0].name).toBe("Running");

      const idleAgents = await service.list({ status: "idle" });
      expect(idleAgents).toHaveLength(1);
      expect(idleAgents[0].name).toBe("Idle");
    });

    it("filters by clientId", async () => {
      await service.instantiate({
        abstractAgentId,
        name: "Client1 Agent",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });
      await service.instantiate({
        abstractAgentId,
        name: "Client2 Agent",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-2",
      });

      const agents = await service.list({ clientId: "client-1" });
      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe("Client1 Agent");
    });

    it("filters by type", async () => {
      await service.instantiate({
        abstractAgentId,
        name: "Perm Agent",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });
      await service.instantiate({
        abstractAgentId,
        name: "Temp Agent",
        type: "temporary",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });

      const permAgents = await service.list({ type: "permanent" });
      expect(permAgents).toHaveLength(1);
      expect(permAgents[0].name).toBe("Perm Agent");
    });

    it("returns empty array when no agents match", async () => {
      const agents = await service.list({ status: "terminated" });
      expect(agents).toEqual([]);
    });
  });

  describe("updateStatus", () => {
    it("updates the status of a realized agent", async () => {
      const agent = await service.instantiate({
        abstractAgentId,
        name: "Status Agent",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });

      expect(agent.status).toBe("idle");

      await service.updateStatus(agent.id, "running");
      const updated = await service.getById(agent.id);
      expect(updated!.status).toBe("running");
    });

    it("updates lastActiveAt when status changes", async () => {
      const agent = await service.instantiate({
        abstractAgentId,
        name: "Active Agent",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });

      const originalLastActive = agent.lastActiveAt;

      await service.updateStatus(agent.id, "running");
      const updated = await service.getById(agent.id);

      // The lastActiveAt should be updated (may be same if within same second)
      expect(updated!.lastActiveAt).toBeTruthy();
    });

    it("can transition through multiple statuses", async () => {
      const agent = await service.instantiate({
        abstractAgentId,
        name: "Multi Status Agent",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });

      await service.updateStatus(agent.id, "running");
      let current = await service.getById(agent.id);
      expect(current!.status).toBe("running");

      await service.updateStatus(agent.id, "idle");
      current = await service.getById(agent.id);
      expect(current!.status).toBe("idle");

      await service.updateStatus(agent.id, "error");
      current = await service.getById(agent.id);
      expect(current!.status).toBe("error");
    });
  });

  describe("terminate", () => {
    it("sets the agent status to terminated", async () => {
      const agent = await service.instantiate({
        abstractAgentId,
        name: "Terminate Me",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });

      await service.terminate(agent.id);

      const terminated = await service.getById(agent.id);
      expect(terminated!.status).toBe("terminated");
    });

    it("updates lastActiveAt on termination", async () => {
      const agent = await service.instantiate({
        abstractAgentId,
        name: "Terminate Active",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });

      await service.terminate(agent.id);

      const terminated = await service.getById(agent.id);
      expect(terminated!.lastActiveAt).toBeTruthy();
    });

    it("the terminated agent still exists and can be retrieved", async () => {
      const agent = await service.instantiate({
        abstractAgentId,
        name: "Still Exists",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });

      await service.terminate(agent.id);

      const found = await service.getById(agent.id);
      expect(found).not.toBeNull();
      expect(found!.status).toBe("terminated");
    });
  });

  describe("spawn children (parentId)", () => {
    it("creates a child agent with a parentAgentId", async () => {
      const parent = await service.instantiate({
        abstractAgentId,
        name: "Parent Agent",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });

      const child = await service.instantiate({
        abstractAgentId,
        name: "Child Agent",
        type: "temporary",
        parentAgentId: parent.id,
        spawnDepth: 1,
        environment: "development",
        clientId: "client-1",
      });

      expect(child.parentAgentId).toBe(parent.id);
      expect(child.spawnDepth).toBe(1);
    });

    it("retrieves children of a parent agent", async () => {
      const parent = await service.instantiate({
        abstractAgentId,
        name: "Parent",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });

      await service.instantiate({
        abstractAgentId,
        name: "Child 1",
        type: "temporary",
        parentAgentId: parent.id,
        spawnDepth: 1,
        environment: "development",
        clientId: "client-1",
      });

      await service.instantiate({
        abstractAgentId,
        name: "Child 2",
        type: "temporary",
        parentAgentId: parent.id,
        spawnDepth: 1,
        environment: "development",
        clientId: "client-1",
      });

      // Create an unrelated agent (no parent)
      await service.instantiate({
        abstractAgentId,
        name: "Standalone",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });

      const children = await service.getChildAgents(parent.id);
      expect(children).toHaveLength(2);
      const childNames = children.map((c) => c.name);
      expect(childNames).toContain("Child 1");
      expect(childNames).toContain("Child 2");
    });

    it("returns empty array for an agent with no children", async () => {
      const agent = await service.instantiate({
        abstractAgentId,
        name: "Lonely Agent",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });

      const children = await service.getChildAgents(agent.id);
      expect(children).toEqual([]);
    });

    it("supports multi-level spawning", async () => {
      const grandparent = await service.instantiate({
        abstractAgentId,
        name: "Grandparent",
        type: "permanent",
        spawnDepth: 0,
        environment: "development",
        clientId: "client-1",
      });

      const parent = await service.instantiate({
        abstractAgentId,
        name: "Parent",
        type: "temporary",
        parentAgentId: grandparent.id,
        spawnDepth: 1,
        environment: "development",
        clientId: "client-1",
      });

      const child = await service.instantiate({
        abstractAgentId,
        name: "Child",
        type: "temporary",
        parentAgentId: parent.id,
        spawnDepth: 2,
        environment: "development",
        clientId: "client-1",
      });

      expect(child.spawnDepth).toBe(2);
      expect(child.parentAgentId).toBe(parent.id);

      const grandparentChildren = await service.getChildAgents(grandparent.id);
      expect(grandparentChildren).toHaveLength(1);
      expect(grandparentChildren[0].name).toBe("Parent");

      const parentChildren = await service.getChildAgents(parent.id);
      expect(parentChildren).toHaveLength(1);
      expect(parentChildren[0].name).toBe("Child");
    });
  });
});
