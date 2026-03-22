/** Environment definitions for isolating agent deployments */
export interface Environment {
  id: string;
  name: string;
  description: string;
  type: EnvironmentType;
  config: EnvironmentConfig;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export type EnvironmentType =
  | "development"
  | "staging"
  | "production"
  | "custom";

export interface EnvironmentConfig {
  llmProvider: string;
  llmModel: string;
  llmApiKey?: string; // stored encrypted
  llmBaseUrl?: string;
  maxConcurrentAgents: number;
  maxTokenBudget: number;
  systemPromptPrefix?: string;
  metadata: Record<string, string>;
}
