import { eq, and, or, desc } from "drizzle-orm";
import type { AppDatabase } from "../db/index.js";
import { abstractTools, toolScripts, toolTemplates } from "../db/schema.js";
import type { AbstractTool, ToolScript, ToolTemplate } from "@open-ogi/shared";
import { generateId } from "@open-ogi/shared";

export class ToolLabService {
  constructor(private db: AppDatabase) {}

  async create(data: {
    name: string;
    description: string;
    toolMd: string;
    environment: string;
    isPublic: boolean;
    createdBy: string;
  }): Promise<AbstractTool> {
    const id = generateId();
    this.db
      .insert(abstractTools)
      .values({
        id,
        name: data.name,
        description: data.description,
        toolMd: data.toolMd,
        environment: data.environment,
        isPublic: data.isPublic,
        createdBy: data.createdBy,
      })
      .run();
    return (await this.getById(id))!;
  }

  async getById(id: string): Promise<AbstractTool | null> {
    const row = this.db
      .select()
      .from(abstractTools)
      .where(eq(abstractTools.id, id))
      .get();

    if (!row) return null;

    const scripts = this.db
      .select()
      .from(toolScripts)
      .where(eq(toolScripts.toolId, id))
      .all();

    const templates = this.db
      .select()
      .from(toolTemplates)
      .where(eq(toolTemplates.toolId, id))
      .all();

    return this.rowToTool(row, scripts, templates);
  }

  async list(filters?: {
    environment?: string;
    createdBy?: string;
    isPublic?: boolean;
  }): Promise<AbstractTool[]> {
    const conditions = [];

    if (filters?.environment) {
      conditions.push(eq(abstractTools.environment, filters.environment));
    }
    if (filters?.createdBy) {
      conditions.push(
        or(
          eq(abstractTools.createdBy, filters.createdBy),
          eq(abstractTools.isPublic, true),
        )!,
      );
    }
    if (filters?.isPublic !== undefined) {
      conditions.push(eq(abstractTools.isPublic, filters.isPublic));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = this.db
      .select()
      .from(abstractTools)
      .where(whereClause)
      .orderBy(desc(abstractTools.updatedAt))
      .all();

    return rows.map((row) => {
      const scripts = this.db
        .select()
        .from(toolScripts)
        .where(eq(toolScripts.toolId, row.id))
        .all();

      const templates = this.db
        .select()
        .from(toolTemplates)
        .where(eq(toolTemplates.toolId, row.id))
        .all();

      return this.rowToTool(row, scripts, templates);
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      toolMd: string;
      environment: string;
      isPublic: boolean;
    }>,
  ): Promise<AbstractTool | null> {
    const existing = this.db
      .select()
      .from(abstractTools)
      .where(eq(abstractTools.id, id))
      .get();

    if (!existing) return null;

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.toolMd !== undefined) updateData.toolMd = data.toolMd;
    if (data.environment !== undefined)
      updateData.environment = data.environment;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

    if (Object.keys(updateData).length === 0) return this.getById(id);

    updateData.updatedAt = new Date().toISOString();
    this.db
      .update(abstractTools)
      .set(updateData)
      .where(eq(abstractTools.id, id))
      .run();

    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = this.db
      .delete(abstractTools)
      .where(eq(abstractTools.id, id))
      .run();
    return result.changes > 0;
  }

  async addScript(
    toolId: string,
    filename: string,
    content: string,
    language: string,
  ): Promise<ToolScript> {
    const id = generateId();
    this.db
      .insert(toolScripts)
      .values({ id, toolId, filename, content, language })
      .run();

    const row = this.db
      .select()
      .from(toolScripts)
      .where(eq(toolScripts.id, id))
      .get()!;

    return {
      id: row.id,
      filename: row.filename,
      content: row.content,
      language: row.language,
      updatedAt: row.updatedAt,
    };
  }

  async addTemplate(
    toolId: string,
    filename: string,
    content: string,
  ): Promise<ToolTemplate> {
    const id = generateId();
    this.db
      .insert(toolTemplates)
      .values({ id, toolId, filename, content })
      .run();

    const row = this.db
      .select()
      .from(toolTemplates)
      .where(eq(toolTemplates.id, id))
      .get()!;

    return {
      id: row.id,
      filename: row.filename,
      content: row.content,
      updatedAt: row.updatedAt,
    };
  }

  async getScripts(toolId: string): Promise<ToolScript[]> {
    const rows = this.db
      .select()
      .from(toolScripts)
      .where(eq(toolScripts.toolId, toolId))
      .all();

    return rows.map((r) => ({
      id: r.id,
      filename: r.filename,
      content: r.content,
      language: r.language,
      updatedAt: r.updatedAt,
    }));
  }

  async getTemplates(toolId: string): Promise<ToolTemplate[]> {
    const rows = this.db
      .select()
      .from(toolTemplates)
      .where(eq(toolTemplates.toolId, toolId))
      .all();

    return rows.map((r) => ({
      id: r.id,
      filename: r.filename,
      content: r.content,
      updatedAt: r.updatedAt,
    }));
  }

  private rowToTool(
    row: typeof abstractTools.$inferSelect,
    scripts: (typeof toolScripts.$inferSelect)[],
    templates: (typeof toolTemplates.$inferSelect)[],
  ): AbstractTool {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      toolMd: row.toolMd,
      scripts: scripts.map((r) => ({
        id: r.id,
        filename: r.filename,
        content: r.content,
        language: r.language,
        updatedAt: r.updatedAt,
      })),
      templates: templates.map((r) => ({
        id: r.id,
        filename: r.filename,
        content: r.content,
        updatedAt: r.updatedAt,
      })),
      assets: [],
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      environment: row.environment,
      isPublic: row.isPublic,
    };
  }
}
