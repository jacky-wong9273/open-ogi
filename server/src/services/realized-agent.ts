import { eq, and, desc } from "drizzle-orm";
import type { AppDatabase } from "../db/index.js";
import { realizedAgents } from "../db/schema.js";
import type { RealizedAgent } from "@open-ogi/shared";
import { generateId } from "@open-ogi/shared";

export class RealizedAgentService {
  constructor(private db: AppDatabase) {}

  async instantiate(data: {
    abstractAgentId: string;
    name: string;
    type: "permanent" | "temporary";
    parentAgentId?: string;
    spawnDepth: number;
    environment: string;
    clientId: string;
  }): Promise<RealizedAgent> {
    const id = generateId();
    this.db
      .insert(realizedAgents)
      .values({
        id,
        abstractAgentId: data.abstractAgentId,
        name: data.name,
        status: "idle",
        type: data.type,
        parentAgentId: data.parentAgentId ?? null,
        spawnDepth: data.spawnDepth,
        environment: data.environment,
        clientId: data.clientId,
      })
      .run();
    return (await this.getById(id))!;
  }

  async getById(id: string): Promise<RealizedAgent | null> {
    const row = this.db
      .select()
      .from(realizedAgents)
      .where(eq(realizedAgents.id, id))
      .get();

    if (!row) return null;
    return this.rowToRealized(row);
  }

  async list(filters?: {
    environment?: string;
    status?: string;
    clientId?: string;
    type?: string;
  }): Promise<RealizedAgent[]> {
    const conditions = [];

    if (filters?.environment)
      conditions.push(eq(realizedAgents.environment, filters.environment));
    if (filters?.status)
      conditions.push(eq(realizedAgents.status, filters.status));
    if (filters?.clientId)
      conditions.push(eq(realizedAgents.clientId, filters.clientId));
    if (filters?.type) conditions.push(eq(realizedAgents.type, filters.type));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = this.db
      .select()
      .from(realizedAgents)
      .where(whereClause)
      .orderBy(desc(realizedAgents.startedAt))
      .all();

    return rows.map((r) => this.rowToRealized(r));
  }

  async updateStatus(
    id: string,
    status: RealizedAgent["status"],
  ): Promise<void> {
    this.db
      .update(realizedAgents)
      .set({ status, lastActiveAt: new Date().toISOString() })
      .where(eq(realizedAgents.id, id))
      .run();
  }

  async terminate(id: string): Promise<void> {
    this.db
      .update(realizedAgents)
      .set({ status: "terminated", lastActiveAt: new Date().toISOString() })
      .where(eq(realizedAgents.id, id))
      .run();
  }

  async getChildAgents(parentId: string): Promise<RealizedAgent[]> {
    const rows = this.db
      .select()
      .from(realizedAgents)
      .where(eq(realizedAgents.parentAgentId, parentId))
      .all();

    return rows.map((r) => this.rowToRealized(r));
  }

  private rowToRealized(
    row: typeof realizedAgents.$inferSelect,
  ): RealizedAgent {
    return {
      id: row.id,
      abstractAgentId: row.abstractAgentId,
      name: row.name,
      status: row.status as RealizedAgent["status"],
      type: row.type as RealizedAgent["type"],
      parentAgentId: row.parentAgentId || undefined,
      spawnDepth: row.spawnDepth,
      environment: row.environment,
      clientId: row.clientId,
      startedAt: row.startedAt,
      lastActiveAt: row.lastActiveAt,
      tokenUsage: {
        totalInput: row.totalInputTokens,
        totalOutput: row.totalOutputTokens,
        totalCost: row.totalCost,
      },
    };
  }
}
