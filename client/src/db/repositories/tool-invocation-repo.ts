import { getClientDatabase } from "../client-db.js";
import { generateId } from "@open-ogi/shared";

export interface ToolInvocationEntry {
  id: string;
  toolName: string;
  agentId: string;
  contextId: string;
  params: Record<string, unknown>;
  result: Record<string, unknown>;
  success: boolean;
  durationMs: number;
  startedAt: string;
  completedAt: string | null;
}

export class ToolInvocationRepository {
  /** Record a tool invocation */
  record(data: {
    toolName: string;
    agentId: string;
    contextId?: string;
    params: Record<string, unknown>;
    result: Record<string, unknown>;
    success: boolean;
    durationMs: number;
  }): string {
    const db = getClientDatabase();
    const id = generateId();
    db.prepare(
      `
      INSERT INTO tool_invocations (id, tool_name, agent_id, context_id, params, result, success, duration_ms, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    ).run(
      id,
      data.toolName,
      data.agentId,
      data.contextId ?? "",
      JSON.stringify(data.params),
      JSON.stringify(data.result),
      data.success ? 1 : 0,
      data.durationMs,
    );
    return id;
  }

  /** Get invocations for an agent */
  getByAgent(agentId: string, limit?: number): ToolInvocationEntry[] {
    const db = getClientDatabase();
    const rows = db
      .prepare(
        `
      SELECT * FROM tool_invocations WHERE agent_id = ? ORDER BY started_at DESC LIMIT ?
    `,
      )
      .all(agentId, limit ?? 100) as any[];

    return rows.map(rowToEntry);
  }

  /** Get invocations for a specific tool */
  getByTool(toolName: string, limit?: number): ToolInvocationEntry[] {
    const db = getClientDatabase();
    const rows = db
      .prepare(
        `
      SELECT * FROM tool_invocations WHERE tool_name = ? ORDER BY started_at DESC LIMIT ?
    `,
      )
      .all(toolName, limit ?? 100) as any[];

    return rows.map(rowToEntry);
  }

  /** Get total count */
  count(): number {
    const db = getClientDatabase();
    const row = db
      .prepare("SELECT COUNT(*) as count FROM tool_invocations")
      .get() as { count: number };
    return row.count;
  }
}

function rowToEntry(row: any): ToolInvocationEntry {
  return {
    id: row.id,
    toolName: row.tool_name,
    agentId: row.agent_id,
    contextId: row.context_id,
    params: JSON.parse(row.params || "{}"),
    result: JSON.parse(row.result || "{}"),
    success: !!row.success,
    durationMs: row.duration_ms,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}
