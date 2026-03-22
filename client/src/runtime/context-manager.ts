import { generateId } from "@open-ogi/shared";

/**
 * Manages workflow contexts and shared references between agents.
 * Agents communicate via context IDs; references are loaded
 * automatically so no additional context transfer is needed.
 */
export class ContextManager {
  private contexts = new Map<string, WorkflowContextState>();

  createContext(name: string, description: string): string {
    const id = generateId();
    this.contexts.set(id, {
      id,
      name,
      description,
      references: new Map(),
      participantAgentIds: new Set(),
      createdAt: new Date().toISOString(),
    });
    return id;
  }

  getContext(contextId: string): WorkflowContextState | undefined {
    return this.contexts.get(contextId);
  }

  /** Add or update a reference within a context */
  setReference(contextId: string, filename: string, content: string): void {
    const ctx = this.contexts.get(contextId);
    if (!ctx) throw new Error(`Context ${contextId} not found`);
    ctx.references.set(filename, content);
  }

  /** Get all references for a context */
  getReferences(contextId: string): Map<string, string> {
    const ctx = this.contexts.get(contextId);
    return ctx?.references ?? new Map();
  }

  /** Get a specific reference */
  getReference(contextId: string, filename: string): string | undefined {
    return this.contexts.get(contextId)?.references.get(filename);
  }

  /** Register an agent as a participant in a context */
  addParticipant(contextId: string, agentId: string): void {
    const ctx = this.contexts.get(contextId);
    if (ctx) ctx.participantAgentIds.add(agentId);
  }

  /** Build a context summary for inclusion in agent prompts */
  buildContextPrompt(contextId: string): string {
    const ctx = this.contexts.get(contextId);
    if (!ctx) return "";

    let prompt = `## Working Context: ${ctx.name}\n\n${ctx.description}\n\n`;
    if (ctx.references.size > 0) {
      prompt += "### References\n\n";
      for (const [filename, content] of ctx.references) {
        prompt += `#### ${filename}\n\n${content}\n\n`;
      }
    }
    return prompt;
  }

  listContexts(): WorkflowContextState[] {
    return Array.from(this.contexts.values());
  }
}

interface WorkflowContextState {
  id: string;
  name: string;
  description: string;
  references: Map<string, string>;
  participantAgentIds: Set<string>;
  createdAt: string;
}
