import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import type { AppDatabase } from "../db/index.js";
import { auditLog } from "../db/schema.js";
import type { AuditLogEntry, AuditAction } from "@open-ogi/shared";

export class AuditService {
  constructor(private db: AppDatabase) {}

  async log(entry: {
    agentId: string;
    userId?: string;
    action: AuditAction | string;
    details: string;
    contextId?: string;
    parentAgentId?: string;
    inputTokens?: number;
    outputTokens?: number;
    ipAddress?: string;
    resourceType?: string;
    resourceId?: string;
  }): Promise<void> {
    this.db
      .insert(auditLog)
      .values({
        agentId: entry.agentId,
        userId: entry.userId ?? "",
        action: entry.action,
        details: entry.details,
        contextId: entry.contextId ?? "",
        parentAgentId: entry.parentAgentId ?? "",
        inputTokens: entry.inputTokens ?? 0,
        outputTokens: entry.outputTokens ?? 0,
        ipAddress: entry.ipAddress ?? "",
        resourceType: entry.resourceType ?? "",
        resourceId: entry.resourceId ?? "",
      })
      .run();
  }

  async getEntries(filters?: {
    agentId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: AuditLogEntry[]; total: number }> {
    const conditions = [];

    if (filters?.agentId) {
      conditions.push(eq(auditLog.agentId, filters.agentId));
    }
    if (filters?.action) {
      conditions.push(eq(auditLog.action, filters.action));
    }
    if (filters?.startDate) {
      conditions.push(gte(auditLog.timestamp, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(auditLog.timestamp, filters.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalRow = this.db
      .select({ count: sql<number>`count(*)` })
      .from(auditLog)
      .where(whereClause)
      .get();

    const total = totalRow?.count ?? 0;

    const baseQuery = this.db
      .select()
      .from(auditLog)
      .where(whereClause)
      .orderBy(desc(auditLog.timestamp));

    const rows =
      filters?.limit !== undefined
        ? baseQuery
            .limit(filters.limit)
            .offset(filters?.offset ?? 0)
            .all()
        : baseQuery.all();

    const entries = rows.map(
      (r): AuditLogEntry => ({
        timestamp: r.timestamp,
        agentId: r.agentId,
        action: r.action as AuditAction,
        details: r.details,
        contextId: r.contextId ?? undefined,
        parentAgentId: r.parentAgentId ?? undefined,
        tokenUsage:
          r.inputTokens || r.outputTokens
            ? { input: r.inputTokens, output: r.outputTokens }
            : undefined,
      }),
    );

    return { entries, total };
  }

  /** Generate markdown audit log for an agent */
  async generateAgentAuditMd(agentId: string): Promise<string> {
    const { entries } = await this.getEntries({ agentId, limit: 1000 });
    let md = `# Audit Log — Agent ${agentId}\n\n`;
    md += "| Timestamp | Action | Details |\n";
    md += "|-----------|--------|---------|\n";
    for (const entry of entries) {
      md += `| ${entry.timestamp} | ${entry.action} | ${entry.details} |\n`;
    }
    return md;
  }
}
