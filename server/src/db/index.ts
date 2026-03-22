import Database from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";
import * as schema from "./schema.js";

export type AppDatabase = BetterSQLite3Database<typeof schema>;

let db: AppDatabase | null = null;
let sqlite: Database.Database | null = null;

export function initDatabase(databaseUrl?: string): AppDatabase {
  if (db) return db;

  const dbPath = (
    databaseUrl ??
    process.env.DATABASE_URL ??
    "file:./data/open-ogi.db"
  )
    .replace("file:", "")
    .replace(/^\.\//, "./");

  // Ensure parent directory exists
  if (dbPath !== ":memory:") {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  db = drizzle(sqlite, { schema });

  pushSchema(sqlite);

  return db;
}

export function getDatabase(): AppDatabase {
  if (!db)
    throw new Error("Database not initialized. Call initDatabase() first.");
  return db;
}

export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}

function pushSchema(sqliteDb: Database.Database): void {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS environments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'development',
      config_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS abstract_agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      agent_md TEXT NOT NULL DEFAULT '',
      instructions_md TEXT NOT NULL DEFAULT '',
      skills_md TEXT NOT NULL DEFAULT '',
      tools_md TEXT NOT NULL DEFAULT '',
      style_md TEXT,
      permitted_skills TEXT NOT NULL DEFAULT '[]',
      permitted_tools TEXT NOT NULL DEFAULT '[]',
      system_prompt_override TEXT,
      environment TEXT NOT NULL DEFAULT 'development',
      is_public INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agent_references (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      context_id TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES abstract_agents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS agent_references_agent_id_idx ON agent_references(agent_id);

    CREATE TABLE IF NOT EXISTS abstract_skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      skill_md TEXT NOT NULL DEFAULT '',
      environment TEXT NOT NULL DEFAULT 'development',
      is_public INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS skill_references (
      id TEXT PRIMARY KEY,
      skill_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (skill_id) REFERENCES abstract_skills(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS skill_references_skill_id_idx ON skill_references(skill_id);

    CREATE TABLE IF NOT EXISTS abstract_tools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      tool_md TEXT NOT NULL DEFAULT '',
      environment TEXT NOT NULL DEFAULT 'development',
      is_public INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tool_scripts (
      id TEXT PRIMARY KEY,
      tool_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      language TEXT NOT NULL DEFAULT 'typescript',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tool_id) REFERENCES abstract_tools(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS tool_scripts_tool_id_idx ON tool_scripts(tool_id);

    CREATE TABLE IF NOT EXISTS tool_templates (
      id TEXT PRIMARY KEY,
      tool_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tool_id) REFERENCES abstract_tools(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS tool_templates_tool_id_idx ON tool_templates(tool_id);

    CREATE TABLE IF NOT EXISTS realized_agents (
      id TEXT PRIMARY KEY,
      abstract_agent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle',
      type TEXT NOT NULL DEFAULT 'permanent',
      parent_agent_id TEXT,
      spawn_depth INTEGER NOT NULL DEFAULT 0,
      environment TEXT NOT NULL DEFAULT 'development',
      client_id TEXT NOT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
      total_input_tokens INTEGER NOT NULL DEFAULT 0,
      total_output_tokens INTEGER NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (abstract_agent_id) REFERENCES abstract_agents(id)
    );
    CREATE INDEX IF NOT EXISTS realized_agents_status_idx ON realized_agents(status);
    CREATE INDEX IF NOT EXISTS realized_agents_environment_idx ON realized_agents(environment);

    CREATE TABLE IF NOT EXISTS token_usage (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      skill_id TEXT,
      tool_id TEXT,
      context_id TEXT NOT NULL DEFAULT '',
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      estimated_cost REAL NOT NULL DEFAULT 0,
      model TEXT NOT NULL DEFAULT '',
      provider TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'agent',
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS token_usage_agent_id_idx ON token_usage(agent_id);
    CREATE INDEX IF NOT EXISTS token_usage_timestamp_idx ON token_usage(timestamp);

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      agent_id TEXT NOT NULL DEFAULT '',
      user_id TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      context_id TEXT,
      parent_agent_id TEXT,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      ip_address TEXT NOT NULL DEFAULT '',
      resource_type TEXT NOT NULL DEFAULT '',
      resource_id TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS audit_log_timestamp_idx ON audit_log(timestamp);
    CREATE INDEX IF NOT EXISTS audit_log_agent_id_idx ON audit_log(agent_id);

    CREATE TABLE IF NOT EXISTS agent_messages (
      id TEXT PRIMARY KEY,
      from_agent_id TEXT NOT NULL,
      to_agent_id TEXT NOT NULL,
      context_id TEXT NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'request',
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS agent_messages_context_id_idx ON agent_messages(context_id);
  `);
}
