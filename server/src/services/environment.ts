import { eq } from "drizzle-orm";
import type { AppDatabase } from "../db/index.js";
import { environments } from "../db/schema.js";
import type { Environment, EnvironmentConfig } from "@open-ogi/shared";
import { generateId } from "@open-ogi/shared";

export class EnvironmentService {
  constructor(private db: AppDatabase) {}

  async list(): Promise<Environment[]> {
    const rows = this.db.select().from(environments).all();
    return rows.map((row) => this.rowToEnvironment(row));
  }

  async getById(id: string): Promise<Environment | null> {
    const row = this.db
      .select()
      .from(environments)
      .where(eq(environments.id, id))
      .get();

    if (!row) return null;
    return this.rowToEnvironment(row);
  }

  async create(data: Partial<Environment>): Promise<Environment> {
    const id = generateId();
    this.db
      .insert(environments)
      .values({
        id,
        name: data.name ?? "",
        description: data.description ?? "",
        type: data.type ?? "development",
        configJson: JSON.stringify(data.config ?? {}),
        createdBy: data.createdBy ?? "",
        isActive: data.isActive ?? true,
      })
      .run();
    return (await this.getById(id))!;
  }

  async update(
    id: string,
    data: Partial<Environment>,
  ): Promise<Environment | null> {
    const existing = this.db
      .select()
      .from(environments)
      .where(eq(environments.id, id))
      .get();

    if (!existing) return null;

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.config !== undefined)
      updateData.configJson = JSON.stringify(data.config);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (Object.keys(updateData).length === 0) return this.getById(id);

    updateData.updatedAt = new Date().toISOString();
    this.db
      .update(environments)
      .set(updateData)
      .where(eq(environments.id, id))
      .run();

    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = this.db
      .delete(environments)
      .where(eq(environments.id, id))
      .run();
    return result.changes > 0;
  }

  private rowToEnvironment(row: typeof environments.$inferSelect): Environment {
    const config: EnvironmentConfig = JSON.parse(row.configJson || "{}");
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type as Environment["type"],
      config,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isActive: row.isActive,
    };
  }
}
