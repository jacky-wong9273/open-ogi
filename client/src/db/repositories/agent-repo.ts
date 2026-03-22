import { getClientDatabase } from "../client-db.js";
import { generateId } from "@open-ogi/shared";

export interface LocalAgent {
  id: string;
  name: string;
  description: string;
  agentMd: string;
  instructionsMd: string;
  skillsMd: string;
  toolsMd: string;
  styleMd: string | null;
  permittedSkills: string[];
  permittedTools: string[];
  systemPromptOverride: string | null;
  environment: string;
  isPublic: boolean;
  source: "local" | "server";
  serverId: string | null;
  createdAt: string;
  updatedAt: string;
}

export class AgentRepository {
  list(environment?: string): LocalAgent[] {
    const db = getClientDatabase();
    const rows = environment
      ? (db
          .prepare(
            "SELECT * FROM agents WHERE environment = ? ORDER BY updated_at DESC",
          )
          .all(environment) as any[])
      : (db
          .prepare("SELECT * FROM agents ORDER BY updated_at DESC")
          .all() as any[]);
    return rows.map(rowToAgent);
  }

  getById(id: string): LocalAgent | null {
    const db = getClientDatabase();
    const row = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as any;
    return row ? rowToAgent(row) : null;
  }

  create(data: Omit<LocalAgent, "id" | "createdAt" | "updatedAt">): LocalAgent {
    const db = getClientDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    db.prepare(
      `
      INSERT INTO agents (id, name, description, agent_md, instructions_md, skills_md, tools_md, style_md,
        permitted_skills, permitted_tools, system_prompt_override, environment, is_public, source, server_id,
        created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      id,
      data.name,
      data.description,
      data.agentMd,
      data.instructionsMd,
      data.skillsMd,
      data.toolsMd,
      data.styleMd,
      JSON.stringify(data.permittedSkills),
      JSON.stringify(data.permittedTools),
      data.systemPromptOverride,
      data.environment,
      data.isPublic ? 1 : 0,
      data.source,
      data.serverId,
      now,
      now,
    );
    return this.getById(id)!;
  }

  update(
    id: string,
    data: Partial<Omit<LocalAgent, "id" | "createdAt" | "updatedAt">>,
  ): LocalAgent | null {
    const db = getClientDatabase();
    const existing = this.getById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      fields.push("name = ?");
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push("description = ?");
      values.push(data.description);
    }
    if (data.agentMd !== undefined) {
      fields.push("agent_md = ?");
      values.push(data.agentMd);
    }
    if (data.instructionsMd !== undefined) {
      fields.push("instructions_md = ?");
      values.push(data.instructionsMd);
    }
    if (data.skillsMd !== undefined) {
      fields.push("skills_md = ?");
      values.push(data.skillsMd);
    }
    if (data.toolsMd !== undefined) {
      fields.push("tools_md = ?");
      values.push(data.toolsMd);
    }
    if (data.styleMd !== undefined) {
      fields.push("style_md = ?");
      values.push(data.styleMd);
    }
    if (data.permittedSkills !== undefined) {
      fields.push("permitted_skills = ?");
      values.push(JSON.stringify(data.permittedSkills));
    }
    if (data.permittedTools !== undefined) {
      fields.push("permitted_tools = ?");
      values.push(JSON.stringify(data.permittedTools));
    }
    if (data.systemPromptOverride !== undefined) {
      fields.push("system_prompt_override = ?");
      values.push(data.systemPromptOverride);
    }
    if (data.environment !== undefined) {
      fields.push("environment = ?");
      values.push(data.environment);
    }
    if (data.isPublic !== undefined) {
      fields.push("is_public = ?");
      values.push(data.isPublic ? 1 : 0);
    }

    if (fields.length === 0) return existing;

    fields.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(id);

    db.prepare(`UPDATE agents SET ${fields.join(", ")} WHERE id = ?`).run(
      ...values,
    );
    return this.getById(id);
  }

  delete(id: string): boolean {
    const db = getClientDatabase();
    const result = db.prepare("DELETE FROM agents WHERE id = ?").run(id);
    return result.changes > 0;
  }

  getByServerId(serverId: string): LocalAgent | null {
    const db = getClientDatabase();
    const row = db
      .prepare("SELECT * FROM agents WHERE server_id = ?")
      .get(serverId) as any;
    return row ? rowToAgent(row) : null;
  }
}

function rowToAgent(row: any): LocalAgent {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    agentMd: row.agent_md,
    instructionsMd: row.instructions_md,
    skillsMd: row.skills_md,
    toolsMd: row.tools_md,
    styleMd: row.style_md ?? null,
    permittedSkills: JSON.parse(row.permitted_skills || "[]"),
    permittedTools: JSON.parse(row.permitted_tools || "[]"),
    systemPromptOverride: row.system_prompt_override ?? null,
    environment: row.environment,
    isPublic: !!row.is_public,
    source: row.source,
    serverId: row.server_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
