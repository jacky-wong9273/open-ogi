import { getClientDatabase } from "../client-db.js";
import type { AuditLogEntry, AuditAction } from "@open-ogi/shared";

export class AuditRepository {
  /** Append-only: insert an audit log entry */
  append(entry: {
    agentId: string;
    action: AuditAction;
    details: string;
    contextId?: string;
    parentAgentId?: string;
    inputTokens?: number;
    outputTokens?: number;
  }): void {
    const db = getClientDatabase();
    db.prepare(
      `
      INSERT INTO audit_log (agent_id, action, details, context_id, parent_agent_id, input_tokens, output_tokens)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      entry.agentId,
      entry.action,
      entry.details,
      entry.contextId ?? null,
      entry.parentAgentId ?? null,
      entry.inputTokens ?? 0,
      entry.outputTokens ?? 0,
    );
  }

  /** Query audit log entries with optional filters */
  query(options?: {
    agentId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): Array<{
    id: number;
    timestamp: string;
    agentId: string;
    action: string;
    details: string;
    contextId: string | null;
    parentAgentId: string | null;
    inputTokens: number;
    outputTokens: number;
  }> {
    const db = getClientDatabase();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options?.agentId) {
      conditions.push("agent_id = ?");
      params.push(options.agentId);
    }
    if (options?.action) {
      conditions.push("action = ?");
      params.push(options.action);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = options?.limit ?? 200;
    const offset = options?.offset ?? 0;

    const rows = db
      .prepare(
        `
      SELECT * FROM audit_log ${where} ORDER BY id DESC LIMIT ? OFFSET ?
    `,
      )
      .all(...params, limit, offset) as any[];

    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      agentId: r.agent_id,
      action: r.action,
      details: r.details,
      contextId: r.context_id,
      parentAgentId: r.parent_agent_id,
      inputTokens: r.input_tokens,
      outputTokens: r.output_tokens,
    }));
  }

  /** Get total count of audit log entries */
  count(): number {
    const db = getClientDatabase();
    const row = db.prepare("SELECT COUNT(*) as count FROM audit_log").get() as {
      count: number;
    };
    return row.count;
  }
}
