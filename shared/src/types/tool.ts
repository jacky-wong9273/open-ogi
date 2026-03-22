/** Tool definition in Tools Lab */
export interface AbstractTool {
  id: string;
  name: string;
  description: string;
  toolMd: string; // TOOL.md content
  scripts: ToolScript[];
  templates: ToolTemplate[];
  assets: ToolAsset[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  environment: string;
  isPublic: boolean;
}

export interface ToolScript {
  id: string;
  filename: string;
  content: string;
  language: string;
  updatedAt: string;
}

export interface ToolTemplate {
  id: string;
  filename: string;
  content: string;
  updatedAt: string;
}

export interface ToolAsset {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  updatedAt: string;
}

/** Tool invocation record */
export interface ToolInvocation {
  id: string;
  toolId: string;
  agentId: string;
  contextId: string;
  input: Record<string, unknown>;
  output: string;
  startedAt: string;
  completedAt: string;
  tokenUsage: { input: number; output: number };
  status: "success" | "error";
  errorMessage?: string;
}
