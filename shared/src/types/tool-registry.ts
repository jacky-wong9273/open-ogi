/**
 * Tool Registry types — factory-based tool registration, input schemas,
 * approval gates, and profiles. Inspired by openclaw's plugin architecture.
 */

/** JSON Schema-based input definition for tools */
export interface ToolInputSchema {
  type: "object";
  properties: Record<string, ToolInputProperty>;
  required?: string[];
}

export interface ToolInputProperty {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  enum?: string[];
  default?: unknown;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  items?: ToolInputProperty;
}

/** Result returned by a tool execution */
export interface ToolResult {
  success: boolean;
  output: ToolResultContent[];
  durationMs: number;
  error?: string;
}

export type ToolResultContent =
  | { type: "text"; text: string }
  | { type: "json"; data: Record<string, unknown> }
  | { type: "error"; message: string };

/** Runtime context passed to tool factories and tool execution */
export interface ToolContext {
  agentId: string;
  sessionKey: string;
  contextId?: string;
  workspaceDir?: string;
  environment: string;
  config: Record<string, unknown>;
}

/** A registered tool with typed execute function */
export interface RegisteredTool {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  execute: (params: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
  ownerOnly?: boolean;
  requiresApproval?: boolean;
  profile?: ToolProfile;
}

/** Factory function that creates a tool given context */
export type ToolFactory = (ctx: ToolContext) => RegisteredTool;

/** Tool registration entry in the registry */
export interface ToolRegistration {
  name: string;
  factory: ToolFactory;
  source: string;
  optional?: boolean;
  profile?: ToolProfile;
}

/** Tool profile controls which tools are available */
export type ToolProfile = "minimal" | "coding" | "messaging" | "full";

/** Tool profile hierarchy — each profile includes tools from lower profiles */
export const TOOL_PROFILE_HIERARCHY: Record<ToolProfile, ToolProfile[]> = {
  minimal: ["minimal"],
  coding: ["minimal", "coding"],
  messaging: ["minimal", "messaging"],
  full: ["minimal", "coding", "messaging", "full"],
};

/** Tool approval request */
export interface ToolApprovalRequest {
  toolName: string;
  agentId: string;
  params: Record<string, unknown>;
  reason: string;
  requestedAt: string;
}

/** Tool approval decision */
export interface ToolApprovalDecision {
  requestId: string;
  approved: boolean;
  decidedBy: string;
  decidedAt: string;
  reason?: string;
}

/** Tool invocation result record for audit */
export interface ToolInvocationRecord {
  id: string;
  toolName: string;
  agentId: string;
  contextId: string;
  params: Record<string, unknown>;
  result: ToolResult;
  startedAt: string;
  completedAt: string;
  approved: boolean;
}
