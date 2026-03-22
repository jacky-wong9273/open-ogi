/** Organizational skill definition in Skills Lab */
export interface AbstractSkill {
  id: string;
  name: string;
  description: string;
  skillMd: string; // SKILL.md content
  references: SkillReference[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  environment: string;
  isPublic: boolean;
}

export interface SkillReference {
  id: string;
  filename: string;
  content: string;
  updatedAt: string;
}

/** Skill invocation record */
export interface SkillInvocation {
  id: string;
  skillId: string;
  agentId: string;
  contextId: string;
  input: string;
  output: string;
  startedAt: string;
  completedAt: string;
  tokenUsage: { input: number; output: number };
  status: "success" | "error";
  errorMessage?: string;
}
