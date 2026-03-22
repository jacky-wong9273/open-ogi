/** Application-wide constants */

export const MAX_SUBAGENT_DEPTH = 2;

export const DEFAULT_LLM_PROVIDER = "deepseek";
export const DEFAULT_LLM_MODEL = "deepseek-chat";
export const DEFAULT_LLM_BASE_URL = "https://api.deepseek.com";

export const SERVER_DEFAULT_PORT = 3100;
export const WS_DEFAULT_PORT = 3101;
export const CLIENT_DASHBOARD_PORT = 3200;
export const UI_DEFAULT_PORT = 3000;

export const TOKEN_COST_PER_MILLION: Record<
  string,
  { input: number; output: number }
> = {
  "deepseek-chat": { input: 0.27, output: 1.1 },
  "deepseek-reasoner": { input: 0.55, output: 2.19 },
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
};

export const AUDIT_LOG_FILENAME = "audit-log.md";
export const REFERENCES_DIR = "references";

export const AGENT_FILES = {
  AGENT_MD: "AGENT.md",
  INSTRUCTIONS_MD: "INSTRUCTIONS.md",
  SKILLS_MD: "SKILLS.md",
  TOOLS_MD: "TOOLS.md",
  STYLE_MD: "STYLE.md",
  AUDIT_LOG: "audit-log.md",
  REFERENCES: "references/",
} as const;

export const SKILL_FILES = {
  SKILL_MD: "SKILL.md",
  AUDIT_LOG: "audit-log.md",
  REFERENCES: "references/",
} as const;

export const TOOL_FILES = {
  TOOL_MD: "TOOL.md",
  AUDIT_LOG: "audit-log.md",
  SCRIPTS: "scripts/",
  TEMPLATES: "templates/",
  ASSETS: "assets/",
} as const;

// ─── Security Constants ────────────────────────────────────

/** Minimum length for JWT secrets in production */
export const MIN_JWT_SECRET_LENGTH = 64;

/** Maximum age for HMAC signed requests (5 minutes) */
export const SIGNED_REQUEST_MAX_AGE_MS = 5 * 60 * 1000;

/** Default rate limit scopes */
export const RATE_LIMIT_SCOPES = {
  GLOBAL: "global",
  AUTH: "auth",
  TOOL_INVOKE: "tool_invoke",
  AGENT_SPAWN: "agent_spawn",
} as const;

/** Default rate limit per scope */
export const RATE_LIMIT_DEFAULTS: Record<string, { max: number; windowMs: number }> = {
  [RATE_LIMIT_SCOPES.GLOBAL]: { max: 100, windowMs: 15 * 60 * 1000 },
  [RATE_LIMIT_SCOPES.AUTH]: { max: 10, windowMs: 60 * 1000 },
  [RATE_LIMIT_SCOPES.TOOL_INVOKE]: { max: 50, windowMs: 60 * 1000 },
  [RATE_LIMIT_SCOPES.AGENT_SPAWN]: { max: 10, windowMs: 60 * 1000 },
};

/** Hook event constants */
export const HOOK_EVENTS = {
  BEFORE_AGENT_START: "before-agent-start",
  AFTER_AGENT_START: "after-agent-start",
  BEFORE_MESSAGE: "before-message",
  AFTER_MESSAGE: "after-message",
  BEFORE_TOOL_INVOKE: "before-tool-invoke",
  AFTER_TOOL_INVOKE: "after-tool-invoke",
  BEFORE_SKILL_INVOKE: "before-skill-invoke",
  AFTER_SKILL_INVOKE: "after-skill-invoke",
  BEFORE_SUBAGENT_SPAWN: "before-subagent-spawn",
  AFTER_SUBAGENT_SPAWN: "after-subagent-spawn",
  AGENT_ERROR: "agent-error",
  AGENT_TERMINATED: "agent-terminated",
} as const;
