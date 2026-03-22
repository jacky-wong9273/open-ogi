import { getClientDatabase } from "../client-db.js";
import { generateId } from "@open-ogi/shared";

export interface ConversationMessage {
  id: string;
  agentId: string;
  contextId: string | null;
  role: string;
  content: string;
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
}

export class ConversationRepository {
  /** Add a message to an agent's conversation history */
  addMessage(data: {
    agentId: string;
    contextId?: string;
    role: string;
    content: string;
    inputTokens?: number;
    outputTokens?: number;
  }): string {
    const db = getClientDatabase();
    const id = generateId();
    db.prepare(
      `
      INSERT INTO conversations (id, agent_id, context_id, role, content, input_tokens, output_tokens)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      id,
      data.agentId,
      data.contextId ?? null,
      data.role,
      data.content,
      data.inputTokens ?? 0,
      data.outputTokens ?? 0,
    );
    return id;
  }

  /** Get conversation history for an agent */
  getHistory(agentId: string, limit?: number): ConversationMessage[] {
    const db = getClientDatabase();
    const rows = db
      .prepare(
        `
      SELECT * FROM conversations WHERE agent_id = ? ORDER BY created_at ASC LIMIT ?
    `,
      )
      .all(agentId, limit ?? 1000) as any[];

    return rows.map((r) => ({
      id: r.id,
      agentId: r.agent_id,
      contextId: r.context_id,
      role: r.role,
      content: r.content,
      inputTokens: r.input_tokens,
      outputTokens: r.output_tokens,
      createdAt: r.created_at,
    }));
  }

  /** Delete conversation history for an agent */
  clearHistory(agentId: string): number {
    const db = getClientDatabase();
    const result = db
      .prepare("DELETE FROM conversations WHERE agent_id = ?")
      .run(agentId);
    return result.changes;
  }

  /** Get message count for an agent */
  count(agentId: string): number {
    const db = getClientDatabase();
    const row = db
      .prepare("SELECT COUNT(*) as count FROM conversations WHERE agent_id = ?")
      .get(agentId) as { count: number };
    return row.count;
  }
}
