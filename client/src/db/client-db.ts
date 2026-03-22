import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

let db: Database.Database | null = null;

export function initClientDatabase(dbPath: string): Database.Database {
  if (db) return db;

  // Ensure parent directory exists
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);

  // Performance and safety pragmas
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("cache_size = -64000"); // 64MB cache
  db.pragma("busy_timeout = 5000");

  runMigrations(db);

  return db;
}

export function getClientDatabase(): Database.Database {
  if (!db)
    throw new Error(
      "Client database not initialized. Call initClientDatabase() first.",
    );
  return db;
}

export function closeClientDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

interface Migration {
  version: number;
  name: string;
  up: (database: Database.Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: "initial_schema",
    up: (database) => {
      database.exec(`
        CREATE TABLE IF NOT EXISTS _migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Local agent definitions (created locally or synced from server)
        CREATE TABLE IF NOT EXISTS agents (
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
          source TEXT NOT NULL DEFAULT 'local',
          server_id TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Local skills
        CREATE TABLE IF NOT EXISTS skills (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          skill_md TEXT NOT NULL DEFAULT '',
          environment TEXT NOT NULL DEFAULT 'development',
          is_public INTEGER NOT NULL DEFAULT 0,
          source TEXT NOT NULL DEFAULT 'local',
          server_id TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Local tools
        CREATE TABLE IF NOT EXISTS tools (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          tool_md TEXT NOT NULL DEFAULT '',
          environment TEXT NOT NULL DEFAULT 'development',
          is_public INTEGER NOT NULL DEFAULT 0,
          source TEXT NOT NULL DEFAULT 'local',
          server_id TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Configuration key-value store
        CREATE TABLE IF NOT EXISTS config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Audit log (append-only for ISO 27001 compliance)
        CREATE TABLE IF NOT EXISTS audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL DEFAULT (datetime('now')),
          agent_id TEXT NOT NULL DEFAULT '',
          action TEXT NOT NULL,
          details TEXT NOT NULL DEFAULT '',
          context_id TEXT,
          parent_agent_id TEXT,
          input_tokens INTEGER NOT NULL DEFAULT 0,
          output_tokens INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_log_agent_id ON audit_log(agent_id);

        -- Conversation history per agent
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          context_id TEXT,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          input_tokens INTEGER NOT NULL DEFAULT 0,
          output_tokens INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);

        -- Tool invocation records
        CREATE TABLE IF NOT EXISTS tool_invocations (
          id TEXT PRIMARY KEY,
          tool_name TEXT NOT NULL,
          agent_id TEXT NOT NULL,
          context_id TEXT NOT NULL DEFAULT '',
          params TEXT NOT NULL DEFAULT '{}',
          result TEXT NOT NULL DEFAULT '{}',
          success INTEGER NOT NULL DEFAULT 0,
          duration_ms INTEGER NOT NULL DEFAULT 0,
          started_at TEXT NOT NULL DEFAULT (datetime('now')),
          completed_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_tool_invocations_agent_id ON tool_invocations(agent_id);

        -- Agent references (working memory)
        CREATE TABLE IF NOT EXISTS agent_references (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          filename TEXT NOT NULL,
          content TEXT NOT NULL DEFAULT '',
          context_id TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_agent_references_agent_id ON agent_references(agent_id);

        -- Token usage tracking
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
        CREATE INDEX IF NOT EXISTS idx_token_usage_agent_id ON token_usage(agent_id);
        CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage(timestamp);
      `);
    },
  },
];

function runMigrations(database: Database.Database): void {
  // Ensure migrations table exists
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    (
      database.prepare("SELECT version FROM _migrations").all() as Array<{
        version: number;
      }>
    ).map((r) => r.version),
  );

  const unapplied = migrations.filter((m) => !applied.has(m.version));

  if (unapplied.length === 0) return;

  const runAll = database.transaction(() => {
    for (const migration of unapplied) {
      migration.up(database);
      database
        .prepare("INSERT INTO _migrations (version, name) VALUES (?, ?)")
        .run(migration.version, migration.name);
    }
  });

  runAll();
}
