import { eq, and, or, desc } from "drizzle-orm";
import type { AppDatabase } from "../db/index.js";
import { abstractSkills, skillReferences } from "../db/schema.js";
import type { AbstractSkill, SkillReference } from "@open-ogi/shared";
import { generateId } from "@open-ogi/shared";

export class SkillLabService {
  constructor(private db: AppDatabase) {}

  async create(data: {
    name: string;
    description: string;
    skillMd: string;
    environment: string;
    isPublic: boolean;
    createdBy: string;
  }): Promise<AbstractSkill> {
    const id = generateId();
    this.db
      .insert(abstractSkills)
      .values({
        id,
        name: data.name,
        description: data.description,
        skillMd: data.skillMd,
        environment: data.environment,
        isPublic: data.isPublic,
        createdBy: data.createdBy,
      })
      .run();
    return (await this.getById(id))!;
  }

  async getById(id: string): Promise<AbstractSkill | null> {
    const row = this.db
      .select()
      .from(abstractSkills)
      .where(eq(abstractSkills.id, id))
      .get();

    if (!row) return null;

    const refs = this.db
      .select()
      .from(skillReferences)
      .where(eq(skillReferences.skillId, id))
      .all();

    return this.rowToSkill(row, refs);
  }

  async list(filters?: {
    environment?: string;
    createdBy?: string;
    isPublic?: boolean;
  }): Promise<AbstractSkill[]> {
    const conditions = [];

    if (filters?.environment) {
      conditions.push(eq(abstractSkills.environment, filters.environment));
    }
    if (filters?.createdBy) {
      conditions.push(
        or(
          eq(abstractSkills.createdBy, filters.createdBy),
          eq(abstractSkills.isPublic, true),
        )!,
      );
    }
    if (filters?.isPublic !== undefined) {
      conditions.push(eq(abstractSkills.isPublic, filters.isPublic));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = this.db
      .select()
      .from(abstractSkills)
      .where(whereClause)
      .orderBy(desc(abstractSkills.updatedAt))
      .all();

    return rows.map((row) => {
      const refs = this.db
        .select()
        .from(skillReferences)
        .where(eq(skillReferences.skillId, row.id))
        .all();
      return this.rowToSkill(row, refs);
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      skillMd: string;
      environment: string;
      isPublic: boolean;
    }>,
  ): Promise<AbstractSkill | null> {
    const existing = this.db
      .select()
      .from(abstractSkills)
      .where(eq(abstractSkills.id, id))
      .get();

    if (!existing) return null;

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.skillMd !== undefined) updateData.skillMd = data.skillMd;
    if (data.environment !== undefined)
      updateData.environment = data.environment;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

    if (Object.keys(updateData).length === 0) return this.getById(id);

    updateData.updatedAt = new Date().toISOString();
    this.db
      .update(abstractSkills)
      .set(updateData)
      .where(eq(abstractSkills.id, id))
      .run();

    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = this.db
      .delete(abstractSkills)
      .where(eq(abstractSkills.id, id))
      .run();
    return result.changes > 0;
  }

  async addReference(
    skillId: string,
    filename: string,
    content: string,
  ): Promise<SkillReference> {
    const id = generateId();
    this.db
      .insert(skillReferences)
      .values({ id, skillId, filename, content })
      .run();

    const ref = this.db
      .select()
      .from(skillReferences)
      .where(eq(skillReferences.id, id))
      .get()!;

    return {
      id: ref.id,
      filename: ref.filename,
      content: ref.content,
      updatedAt: ref.updatedAt,
    };
  }

  async getReferences(skillId: string): Promise<SkillReference[]> {
    const rows = this.db
      .select()
      .from(skillReferences)
      .where(eq(skillReferences.skillId, skillId))
      .all();

    return rows.map((r) => ({
      id: r.id,
      filename: r.filename,
      content: r.content,
      updatedAt: r.updatedAt,
    }));
  }

  private rowToSkill(
    row: typeof abstractSkills.$inferSelect,
    refs: (typeof skillReferences.$inferSelect)[],
  ): AbstractSkill {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      skillMd: row.skillMd,
      references: refs.map((r) => ({
        id: r.id,
        filename: r.filename,
        content: r.content,
        updatedAt: r.updatedAt,
      })),
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      environment: row.environment,
      isPublic: row.isPublic,
    };
  }
}
