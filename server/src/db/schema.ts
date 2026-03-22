import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── Users & RBAC ──────────────────────────────────────────

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("viewer"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  lastLoginAt: text("last_login_at"),
});

// ─── Environments ──────────────────────────────────────────

export const environments = sqliteTable("environments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  type: text("type").notNull().default("development"),
  configJson: text("config_json").notNull().default("{}"),
  createdBy: text("created_by").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── Abstract Agents ───────────────────────────────────────

export const abstractAgents = sqliteTable("abstract_agents", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  agentMd: text("agent_md").notNull().default(""),
  instructionsMd: text("instructions_md").notNull().default(""),
  skillsMd: text("skills_md").notNull().default(""),
  toolsMd: text("tools_md").notNull().default(""),
  styleMd: text("style_md"),
  permittedSkills: text("permitted_skills").notNull().default("[]"),
  permittedTools: text("permitted_tools").notNull().default("[]"),
  systemPromptOverride: text("system_prompt_override"),
  environment: text("environment").notNull().default("development"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── Agent References ──────────────────────────────────────

export const agentReferences = sqliteTable(
  "agent_references",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    agentId: text("agent_id").notNull(),
    filename: text("filename").notNull(),
    content: text("content").notNull().default(""),
    contextId: text("context_id").notNull().default(""),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index("agent_references_agent_id_idx").on(table.agentId)],
);

// ─── Abstract Skills ───────────────────────────────────────

export const abstractSkills = sqliteTable("abstract_skills", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  skillMd: text("skill_md").notNull().default(""),
  environment: text("environment").notNull().default("development"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── Skill References ──────────────────────────────────────

export const skillReferences = sqliteTable(
  "skill_references",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    skillId: text("skill_id").notNull(),
    filename: text("filename").notNull(),
    content: text("content").notNull().default(""),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index("skill_references_skill_id_idx").on(table.skillId)],
);

// ─── Abstract Tools ────────────────────────────────────────

export const abstractTools = sqliteTable("abstract_tools", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  toolMd: text("tool_md").notNull().default(""),
  environment: text("environment").notNull().default("development"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── Tool Scripts ──────────────────────────────────────────

export const toolScripts = sqliteTable(
  "tool_scripts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    toolId: text("tool_id").notNull(),
    filename: text("filename").notNull(),
    content: text("content").notNull().default(""),
    language: text("language").notNull().default("typescript"),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index("tool_scripts_tool_id_idx").on(table.toolId)],
);

// ─── Tool Templates ────────────────────────────────────────

export const toolTemplates = sqliteTable(
  "tool_templates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    toolId: text("tool_id").notNull(),
    filename: text("filename").notNull(),
    content: text("content").notNull().default(""),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index("tool_templates_tool_id_idx").on(table.toolId)],
);

// ─── Realized Agents ───────────────────────────────────────

export const realizedAgents = sqliteTable(
  "realized_agents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    abstractAgentId: text("abstract_agent_id").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("idle"),
    type: text("type").notNull().default("permanent"),
    parentAgentId: text("parent_agent_id"),
    spawnDepth: integer("spawn_depth").notNull().default(0),
    environment: text("environment").notNull().default("development"),
    clientId: text("client_id").notNull(),
    startedAt: text("started_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    lastActiveAt: text("last_active_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    totalInputTokens: integer("total_input_tokens").notNull().default(0),
    totalOutputTokens: integer("total_output_tokens").notNull().default(0),
    totalCost: real("total_cost").notNull().default(0),
  },
  (table) => [
    index("realized_agents_status_idx").on(table.status),
    index("realized_agents_environment_idx").on(table.environment),
  ],
);

// ─── Token Usage ───────────────────────────────────────────

export const tokenUsage = sqliteTable(
  "token_usage",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    agentId: text("agent_id").notNull(),
    skillId: text("skill_id"),
    toolId: text("tool_id"),
    contextId: text("context_id").notNull().default(""),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    estimatedCost: real("estimated_cost").notNull().default(0),
    model: text("model").notNull().default(""),
    provider: text("provider").notNull().default(""),
    type: text("type").notNull().default("agent"),
    timestamp: text("timestamp")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("token_usage_agent_id_idx").on(table.agentId),
    index("token_usage_timestamp_idx").on(table.timestamp),
  ],
);

// ─── Audit Log ─────────────────────────────────────────────

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    timestamp: text("timestamp")
      .notNull()
      .default(sql`(datetime('now'))`),
    agentId: text("agent_id").notNull().default(""),
    userId: text("user_id").notNull().default(""),
    action: text("action").notNull(),
    details: text("details").notNull().default(""),
    contextId: text("context_id"),
    parentAgentId: text("parent_agent_id"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    ipAddress: text("ip_address").notNull().default(""),
    resourceType: text("resource_type").notNull().default(""),
    resourceId: text("resource_id").notNull().default(""),
  },
  (table) => [
    index("audit_log_timestamp_idx").on(table.timestamp),
    index("audit_log_agent_id_idx").on(table.agentId),
  ],
);

// ─── Agent Messages ────────────────────────────────────────

export const agentMessages = sqliteTable(
  "agent_messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    fromAgentId: text("from_agent_id").notNull(),
    toAgentId: text("to_agent_id").notNull(),
    contextId: text("context_id").notNull(),
    content: text("content").notNull(),
    messageType: text("message_type").notNull().default("request"),
    timestamp: text("timestamp")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index("agent_messages_context_id_idx").on(table.contextId)],
);
