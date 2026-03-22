/** Token usage tracking */
export interface TokenUsageRecord {
  id: string;
  agentId: string;
  skillId?: string;
  toolId?: string;
  contextId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
  provider: string;
  timestamp: string;
  type: "agent" | "skill" | "tool";
}

/** Aggregated token usage for a time period */
export interface TokenUsageAggregate {
  entityId: string;
  entityType: "agent" | "skill" | "tool";
  entityName: string;
  period: string; // ISO date string
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  invocationCount: number;
}

/** Token usage timeline point */
export interface TokenUsageTimelinePoint {
  timestamp: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

/** Token usage report */
export interface TokenUsageReport {
  startDate: string;
  endDate: string;
  byAgent: TokenUsageAggregate[];
  bySkill: TokenUsageAggregate[];
  byTool: TokenUsageAggregate[];
  timeline: TokenUsageTimelinePoint[];
  totalCost: number;
  totalTokens: number;
}
