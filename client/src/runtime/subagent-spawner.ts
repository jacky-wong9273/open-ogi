import type { AbstractAgent } from "@open-ogi/shared";
import { MAX_SUBAGENT_DEPTH, validateSpawnDepth } from "@open-ogi/shared";
import type { AgentRuntime } from "./agent-runtime.js";

export interface SpawnRequest {
  parentAgent: AgentRuntime;
  abstractAgent: AbstractAgent;
  task: string;
  contextId: string;
}

/**
 * Manages subagent spawning with depth constraints.
 * - Max 2 layers of recursive spawning
 * - Temporary agents can only talk to parent agent
 * - Permanent agents can talk to each other
 */
export class SubagentSpawner {
  private activeSubagents = new Map<string, AgentRuntime>();

  constructor(
    private createRuntime: (
      agent: AbstractAgent,
      parentId: string,
      depth: number,
      contextId: string,
    ) => AgentRuntime,
  ) {}

  spawn(request: SpawnRequest): AgentRuntime | null {
    const parentDepth = request.parentAgent.getSpawnDepth();

    if (!validateSpawnDepth(parentDepth, MAX_SUBAGENT_DEPTH)) {
      request.parentAgent
        .getAuditLogger()
        .log(
          "error",
          `Cannot spawn subagent: max depth (${MAX_SUBAGENT_DEPTH}) reached`,
          { contextId: request.contextId },
        );
      return null;
    }

    const subagent = this.createRuntime(
      request.abstractAgent,
      request.parentAgent.getId(),
      parentDepth + 1,
      request.contextId,
    );

    this.activeSubagents.set(subagent.getId(), subagent);

    request.parentAgent
      .getAuditLogger()
      .log(
        "subagent_spawned",
        `Spawned subagent ${subagent.getId()} (depth: ${parentDepth + 1}) for task: ${request.task}`,
        { contextId: request.contextId },
      );

    subagent
      .getAuditLogger()
      .log(
        "agent_started",
        `Spawned as subagent of ${request.parentAgent.getId()} with task: ${request.task}`,
        {
          contextId: request.contextId,
          parentAgentId: request.parentAgent.getId(),
        },
      );

    return subagent;
  }

  getSubagent(id: string): AgentRuntime | undefined {
    return this.activeSubagents.get(id);
  }

  terminateSubagent(id: string): void {
    const subagent = this.activeSubagents.get(id);
    if (subagent) {
      subagent.terminate();
      subagent.getAuditLogger().log("agent_stopped", "Subagent terminated");
      this.activeSubagents.delete(id);
    }
  }

  getActiveSubagents(): AgentRuntime[] {
    return Array.from(this.activeSubagents.values());
  }

  getSubagentsByParent(parentId: string): AgentRuntime[] {
    return Array.from(this.activeSubagents.values()).filter(
      (a) => a.getParentId() === parentId,
    );
  }
}
