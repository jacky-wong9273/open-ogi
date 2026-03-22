import { eq, and, gte, lte, sql } from "drizzle-orm";
import type { AppDatabase } from "../db/index.js";
import { tokenUsage, realizedAgents } from "../db/schema.js";
import { generateId, calculateTokenCost } from "@open-ogi/shared";
import type {
  TokenUsageRecord,
  TokenUsageAggregate,
  TokenUsageReport,
  TokenUsageTimelinePoint,
} from "@open-ogi/shared";

export class TokenTrackerService {
  constructor(private db: AppDatabase) {}

  async record(data: {
    agentId: string;
    skillId?: string;
    toolId?: string;
    contextId: string;
    inputTokens: number;
    outputTokens: number;
    model: string;
    provider: string;
    type: "agent" | "skill" | "tool";
  }): Promise<TokenUsageRecord> {
    const id = generateId();
    const totalTokens = data.inputTokens + data.outputTokens;
    const estimatedCost = calculateTokenCost(
      data.model,
      data.inputTokens,
      data.outputTokens,
    );

    this.db
      .insert(tokenUsage)
      .values({
        id,
        agentId: data.agentId,
        skillId: data.skillId ?? null,
        toolId: data.toolId ?? null,
        contextId: data.contextId,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        totalTokens,
        estimatedCost,
        model: data.model,
        provider: data.provider,
        type: data.type,
      })
      .run();

    // Also update realized agent totals using SQL increments
    this.db
      .update(realizedAgents)
      .set({
        totalInputTokens: sql`total_input_tokens + ${data.inputTokens}`,
        totalOutputTokens: sql`total_output_tokens + ${data.outputTokens}`,
        totalCost: sql`total_cost + ${estimatedCost}`,
        lastActiveAt: new Date().toISOString(),
      })
      .where(eq(realizedAgents.id, data.agentId))
      .run();

    return {
      id,
      agentId: data.agentId,
      skillId: data.skillId,
      toolId: data.toolId,
      contextId: data.contextId,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalTokens,
      estimatedCost,
      model: data.model,
      provider: data.provider,
      timestamp: new Date().toISOString(),
      type: data.type,
    };
  }

  async getReport(
    startDate: string,
    endDate: string,
  ): Promise<TokenUsageReport> {
    const byAgent = this.aggregate("agentId", "agent", startDate, endDate);
    const bySkill = this.aggregate("skillId", "skill", startDate, endDate);
    const byTool = this.aggregate("toolId", "tool", startDate, endDate);
    const timeline = this.getTimeline(startDate, endDate);

    const totals = this.db
      .select({
        totalTokens: sql<number>`COALESCE(SUM(total_tokens), 0)`,
        totalCost: sql<number>`COALESCE(SUM(estimated_cost), 0)`,
      })
      .from(tokenUsage)
      .where(
        and(
          gte(tokenUsage.timestamp, startDate),
          lte(tokenUsage.timestamp, endDate),
        ),
      )
      .get();

    return {
      startDate,
      endDate,
      byAgent,
      bySkill,
      byTool,
      timeline,
      totalCost: totals?.totalCost ?? 0,
      totalTokens: totals?.totalTokens ?? 0,
    };
  }

  async getAgentTimeline(
    agentId: string,
    startDate: string,
    endDate: string,
  ): Promise<TokenUsageTimelinePoint[]> {
    const rows = this.db.all<{
      hour: string;
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
      cost: number;
    }>(sql`
      SELECT
        strftime('%Y-%m-%dT%H:00:00Z', timestamp) as hour,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost) as cost
      FROM token_usage
      WHERE agent_id = ${agentId}
        AND timestamp >= ${startDate}
        AND timestamp <= ${endDate}
      GROUP BY hour
      ORDER BY hour
    `);

    return rows.map((r) => ({
      timestamp: r.hour,
      inputTokens: Number(r.input_tokens),
      outputTokens: Number(r.output_tokens),
      totalTokens: Number(r.total_tokens),
      cost: r.cost,
    }));
  }

  private aggregate(
    groupField: "agentId" | "skillId" | "toolId",
    type: string,
    startDate: string,
    endDate: string,
  ): TokenUsageAggregate[] {
    // Map field names to SQL column names (safe whitelist)
    const groupCol =
      groupField === "agentId"
        ? "agent_id"
        : groupField === "skillId"
          ? "skill_id"
          : "tool_id";

    // Use sql.raw() for the whitelisted column name; parameterize all values
    const rows = this.db.all<{
      entity_id: string;
      total_input: number;
      total_output: number;
      total_tokens: number;
      total_cost: number;
      invocation_count: number;
    }>(sql`
      SELECT
        ${sql.raw(groupCol)} as entity_id,
        SUM(input_tokens) as total_input,
        SUM(output_tokens) as total_output,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost) as total_cost,
        COUNT(*) as invocation_count
      FROM token_usage
      WHERE type = ${type}
        AND timestamp >= ${startDate}
        AND timestamp <= ${endDate}
        AND ${sql.raw(groupCol)} IS NOT NULL
      GROUP BY ${sql.raw(groupCol)}
      ORDER BY total_cost DESC
    `);

    return rows.map((r) => ({
      entityId: r.entity_id,
      entityType: type as "agent" | "skill" | "tool",
      entityName: r.entity_id,
      period: `${startDate}/${endDate}`,
      totalInputTokens: Number(r.total_input),
      totalOutputTokens: Number(r.total_output),
      totalTokens: Number(r.total_tokens),
      totalCost: r.total_cost,
      invocationCount: Number(r.invocation_count),
    }));
  }

  private getTimeline(
    startDate: string,
    endDate: string,
  ): TokenUsageTimelinePoint[] {
    const rows = this.db.all<{
      hour: string;
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
      cost: number;
    }>(sql`
      SELECT
        strftime('%Y-%m-%dT%H:00:00Z', timestamp) as hour,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost) as cost
      FROM token_usage
      WHERE timestamp >= ${startDate}
        AND timestamp <= ${endDate}
      GROUP BY hour
      ORDER BY hour
    `);

    return rows.map((r) => ({
      timestamp: r.hour,
      inputTokens: Number(r.input_tokens),
      outputTokens: Number(r.output_tokens),
      totalTokens: Number(r.total_tokens),
      cost: r.cost,
    }));
  }
}
