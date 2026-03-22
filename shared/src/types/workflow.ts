/** Agentic workflow types */
export interface WorkflowContext {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  references: Map<string, string>; // filename -> content
  participantAgentIds: string[];
}

/** Subagent spawn request */
export interface SubagentSpawnRequest {
  parentAgentId: string;
  abstractAgentId: string;
  task: string;
  contextId: string;
  maxDepth: number; // max 2
  currentDepth: number;
}

/** Agent communication message */
export interface WorkflowMessage {
  id: string;
  contextId: string;
  fromAgentId: string;
  toAgentId: string;
  content: string;
  timestamp: string;
  messageType:
    | "task_assignment"
    | "progress_update"
    | "completion"
    | "error"
    | "collaboration";
}

/** Workflow execution state */
export interface WorkflowExecution {
  id: string;
  contextId: string;
  rootAgentId: string;
  agents: WorkflowAgentState[];
  status: "running" | "completed" | "error";
  startedAt: string;
  completedAt?: string;
}

export interface WorkflowAgentState {
  agentId: string;
  role: string;
  status: "idle" | "running" | "completed" | "error";
  depth: number;
  parentId?: string;
  childIds: string[];
}
