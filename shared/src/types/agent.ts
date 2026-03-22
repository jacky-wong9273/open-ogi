/** Abstract agent definition stored in Agent Lab */
export interface AbstractAgent {
  id: string;
  name: string;
  description: string;
  agentMd: string; // AGENT.md content
  instructionsMd: string; // INSTRUCTIONS.md content
  skillsMd: string; // SKILLS.md content
  toolsMd: string; // TOOLS.md content
  styleMd?: string; // STYLE.md content (optional)
  references: AgentReference[];
  permittedSkills: string[];
  permittedTools: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  environment: string;
  isPublic: boolean;
  systemPromptOverride?: string;
}

/** Reference file in an agent's references/ directory */
export interface AgentReference {
  id: string;
  filename: string;
  content: string;
  contextId: string;
  updatedAt: string;
}

/** Realized (instantiated) agent running on client */
export interface RealizedAgent {
  id: string;
  abstractAgentId: string;
  name: string;
  status: AgentStatus;
  type: AgentType;
  parentAgentId?: string;
  spawnDepth: number;
  environment: string;
  clientId: string;
  startedAt: string;
  lastActiveAt: string;
  tokenUsage: TokenSummary;
}

export type AgentStatus =
  | "idle"
  | "running"
  | "waiting"
  | "error"
  | "terminated";
export type AgentType = "permanent" | "temporary";

export interface TokenSummary {
  totalInput: number;
  totalOutput: number;
  totalCost: number;
}

/** Audit log entry */
export interface AuditLogEntry {
  timestamp: string;
  agentId: string;
  action: AuditAction;
  details: string;
  contextId?: string;
  parentAgentId?: string;
  tokenUsage?: { input: number; output: number };
}

export type AuditAction =
  | "agent_started"
  | "agent_stopped"
  | "skill_invoked"
  | "tool_invoked"
  | "subagent_spawned"
  | "subagent_completed"
  | "message_sent"
  | "message_received"
  | "reference_updated"
  | "error";

/** Message between agents */
export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  contextId: string;
  content: string;
  timestamp: string;
  type: "request" | "response" | "notification";
}
