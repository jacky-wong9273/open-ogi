import { eq, desc } from "drizzle-orm";
import type { AppDatabase } from "../db/index.js";
import { agentMessages } from "../db/schema.js";
import { generateId } from "@open-ogi/shared";

export interface AgentMessage {
  id: string;
  contextId: string;
  agentId: string;
  role: string;
  content: string;
  metadata?: string;
  timestamp: string;
}

export class MessageService {
  constructor(private db: AppDatabase) {}

  async getByContext(
    contextId: string,
    limit?: number,
  ): Promise<AgentMessage[]> {
    const baseQuery = this.db
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.contextId, contextId))
      .orderBy(desc(agentMessages.timestamp));

    const rows =
      limit !== undefined ? baseQuery.limit(limit).all() : baseQuery.all();

    return rows.map((row) => this.rowToMessage(row));
  }

  async getByAgent(agentId: string, limit?: number): Promise<AgentMessage[]> {
    const baseQuery = this.db
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.fromAgentId, agentId))
      .orderBy(desc(agentMessages.timestamp));

    const rows =
      limit !== undefined ? baseQuery.limit(limit).all() : baseQuery.all();

    return rows.map((row) => this.rowToMessage(row));
  }

  async create(data: {
    contextId: string;
    agentId: string;
    role: string;
    content: string;
    metadata?: string;
  }): Promise<AgentMessage> {
    const id = generateId();
    this.db
      .insert(agentMessages)
      .values({
        id,
        fromAgentId: data.agentId,
        toAgentId: data.metadata ?? "",
        contextId: data.contextId,
        content: data.content,
        messageType: data.role,
      })
      .run();

    return (await this.getById(id))!;
  }

  async getById(id: string): Promise<AgentMessage | null> {
    const row = this.db
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.id, id))
      .get();

    if (!row) return null;

    return this.rowToMessage(row);
  }

  private rowToMessage(row: typeof agentMessages.$inferSelect): AgentMessage {
    return {
      id: row.id,
      contextId: row.contextId,
      agentId: row.fromAgentId,
      role: row.messageType,
      content: row.content,
      metadata: row.toAgentId || undefined,
      timestamp: row.timestamp,
    };
  }
}
