import { eq, and, or, desc } from "drizzle-orm";
import type { AppDatabase } from "../db/index.js";
import { abstractAgents, agentReferences } from "../db/schema.js";
import type { AbstractAgent, AgentReference } from "@open-ogi/shared";
import { generateId } from "@open-ogi/shared";

export class AgentLabService {
  constructor(private db: AppDatabase) {}

  async create(data: {
    name: string;
    description: string;
    agentMd: string;
    instructionsMd: string;
    skillsMd: string;
    toolsMd: string;
    styleMd?: string;
    permittedSkills: string[];
    permittedTools: string[];
    environment: string;
    isPublic: boolean;
    createdBy: string;
    systemPromptOverride?: string;
  }): Promise<AbstractAgent> {
    const id = generateId();
    this.db
      .insert(abstractAgents)
      .values({
        id,
        name: data.name,
        description: data.description,
        agentMd: data.agentMd,
        instructionsMd: data.instructionsMd,
        skillsMd: data.skillsMd,
        toolsMd: data.toolsMd,
        styleMd: data.styleMd ?? "",
        permittedSkills: JSON.stringify(data.permittedSkills),
        permittedTools: JSON.stringify(data.permittedTools),
        environment: data.environment,
        isPublic: data.isPublic,
        createdBy: data.createdBy,
        systemPromptOverride: data.systemPromptOverride ?? null,
      })
      .run();
    return (await this.getById(id))!;
  }

  async getById(id: string): Promise<AbstractAgent | null> {
    const row = this.db
      .select()
      .from(abstractAgents)
      .where(eq(abstractAgents.id, id))
      .get();

    if (!row) return null;

    const refs = this.db
      .select()
      .from(agentReferences)
      .where(eq(agentReferences.agentId, id))
      .all();

    return this.rowToAgent(row, refs);
  }

  async list(filters?: {
    environment?: string;
    createdBy?: string;
    isPublic?: boolean;
  }): Promise<AbstractAgent[]> {
    const conditions = [];

    if (filters?.environment) {
      conditions.push(eq(abstractAgents.environment, filters.environment));
    }
    if (filters?.createdBy) {
      conditions.push(
        or(
          eq(abstractAgents.createdBy, filters.createdBy),
          eq(abstractAgents.isPublic, true),
        )!,
      );
    }
    if (filters?.isPublic !== undefined) {
      conditions.push(eq(abstractAgents.isPublic, filters.isPublic));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = this.db
      .select()
      .from(abstractAgents)
      .where(whereClause)
      .orderBy(desc(abstractAgents.updatedAt))
      .all();

    return rows.map((row) => {
      const refs = this.db
        .select()
        .from(agentReferences)
        .where(eq(agentReferences.agentId, row.id))
        .all();
      return this.rowToAgent(row, refs);
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      agentMd: string;
      instructionsMd: string;
      skillsMd: string;
      toolsMd: string;
      styleMd: string;
      permittedSkills: string[];
      permittedTools: string[];
      environment: string;
      isPublic: boolean;
      systemPromptOverride: string;
    }>,
  ): Promise<AbstractAgent | null> {
    const existing = this.db
      .select()
      .from(abstractAgents)
      .where(eq(abstractAgents.id, id))
      .get();

    if (!existing) return null;

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.agentMd !== undefined) updateData.agentMd = data.agentMd;
    if (data.instructionsMd !== undefined)
      updateData.instructionsMd = data.instructionsMd;
    if (data.skillsMd !== undefined) updateData.skillsMd = data.skillsMd;
    if (data.toolsMd !== undefined) updateData.toolsMd = data.toolsMd;
    if (data.styleMd !== undefined) updateData.styleMd = data.styleMd;
    if (data.permittedSkills !== undefined)
      updateData.permittedSkills = JSON.stringify(data.permittedSkills);
    if (data.permittedTools !== undefined)
      updateData.permittedTools = JSON.stringify(data.permittedTools);
    if (data.environment !== undefined)
      updateData.environment = data.environment;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
    if (data.systemPromptOverride !== undefined)
      updateData.systemPromptOverride = data.systemPromptOverride;

    if (Object.keys(updateData).length === 0) return this.getById(id);

    updateData.updatedAt = new Date().toISOString();
    this.db
      .update(abstractAgents)
      .set(updateData)
      .where(eq(abstractAgents.id, id))
      .run();

    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = this.db
      .delete(abstractAgents)
      .where(eq(abstractAgents.id, id))
      .run();
    return result.changes > 0;
  }

  // Reference management
  async addReference(
    agentId: string,
    filename: string,
    content: string,
    contextId: string,
  ): Promise<AgentReference> {
    const id = generateId();
    this.db
      .insert(agentReferences)
      .values({ id, agentId, filename, content, contextId })
      .run();

    const ref = this.db
      .select()
      .from(agentReferences)
      .where(eq(agentReferences.id, id))
      .get()!;

    return {
      id: ref.id,
      filename: ref.filename,
      content: ref.content,
      contextId: ref.contextId,
      updatedAt: ref.updatedAt,
    };
  }

  async getReferences(agentId: string): Promise<AgentReference[]> {
    const rows = this.db
      .select()
      .from(agentReferences)
      .where(eq(agentReferences.agentId, agentId))
      .all();

    return rows.map((r) => ({
      id: r.id,
      filename: r.filename,
      content: r.content,
      contextId: r.contextId,
      updatedAt: r.updatedAt,
    }));
  }

  async updateReference(refId: string, content: string): Promise<void> {
    this.db
      .update(agentReferences)
      .set({ content, updatedAt: new Date().toISOString() })
      .where(eq(agentReferences.id, refId))
      .run();
  }

  async deleteReference(refId: string): Promise<void> {
    this.db.delete(agentReferences).where(eq(agentReferences.id, refId)).run();
  }

  private rowToAgent(
    row: typeof abstractAgents.$inferSelect,
    refs: (typeof agentReferences.$inferSelect)[],
  ): AbstractAgent {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      agentMd: row.agentMd,
      instructionsMd: row.instructionsMd,
      skillsMd: row.skillsMd,
      toolsMd: row.toolsMd,
      styleMd: row.styleMd || undefined,
      references: refs.map((r) => ({
        id: r.id,
        filename: r.filename,
        content: r.content,
        contextId: r.contextId,
        updatedAt: r.updatedAt,
      })),
      permittedSkills: JSON.parse(row.permittedSkills || "[]"),
      permittedTools: JSON.parse(row.permittedTools || "[]"),
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      environment: row.environment,
      isPublic: row.isPublic,
      systemPromptOverride: row.systemPromptOverride || undefined,
    };
  }
}
