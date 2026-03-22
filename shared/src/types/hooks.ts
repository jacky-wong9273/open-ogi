/**
 * Hook system types — lifecycle events for agent operations.
 * Inspired by openclaw's event-driven hook system.
 */

/** Available hook event names */
export type HookEvent =
  | "before-agent-start"
  | "after-agent-start"
  | "before-message"
  | "after-message"
  | "before-tool-invoke"
  | "after-tool-invoke"
  | "before-skill-invoke"
  | "after-skill-invoke"
  | "before-subagent-spawn"
  | "after-subagent-spawn"
  | "agent-error"
  | "agent-terminated";

/** Context passed to hook handlers */
export interface HookContext {
  agentId: string;
  agentName: string;
  environment: string;
  contextId?: string;
  timestamp: string;
}

/** Hook handler function */
export type HookHandler = (
  event: HookEvent,
  ctx: HookContext,
  data: Record<string, unknown>,
) => void | Promise<void>;

/** Hook registration entry */
export interface HookRegistration {
  id: string;
  events: HookEvent[];
  handler: HookHandler;
  priority: number;
  source: string;
}
