import {
  generateId,
  now,
  createAuditLogHeader,
  formatAuditEntry,
} from "@open-ogi/shared";
import type { AuditLogEntry, AuditAction } from "@open-ogi/shared";

/**
 * Append-only audit logger for agent operations.
 * Maintains an in-memory log that can be flushed to server.
 */
export class AuditLogger {
  private entries: AuditLogEntry[] = [];
  private readonly agentId: string;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  log(
    action: AuditAction,
    details: string,
    options?: {
      contextId?: string;
      parentAgentId?: string;
      tokenUsage?: { input: number; output: number };
    },
  ): void {
    this.entries.push({
      timestamp: now(),
      agentId: this.agentId,
      action,
      details,
      contextId: options?.contextId,
      parentAgentId: options?.parentAgentId,
      tokenUsage: options?.tokenUsage,
    });
  }

  /** Generate markdown content for audit-log.md */
  toMarkdown(): string {
    let md = createAuditLogHeader();
    for (const entry of this.entries) {
      md += formatAuditEntry(
        entry.timestamp,
        entry.action,
        entry.agentId,
        entry.details,
      );
    }
    return md;
  }

  getEntries(): AuditLogEntry[] {
    return [...this.entries];
  }

  getNewEntries(sinceIndex: number): AuditLogEntry[] {
    return this.entries.slice(sinceIndex);
  }

  get length(): number {
    return this.entries.length;
  }
}
