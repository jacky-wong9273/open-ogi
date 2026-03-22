import { randomUUID } from "node:crypto";
import { TOKEN_COST_PER_MILLION } from "./constants.js";

/** Generate a unique ID */
export function generateId(): string {
  return randomUUID();
}

/** Get current ISO timestamp */
export function now(): string {
  return new Date().toISOString();
}

/** Calculate token cost for a given model */
export function calculateTokenCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const costs = TOKEN_COST_PER_MILLION[model];
  if (!costs) return 0;
  return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;
}

/** Format an audit log entry as markdown */
export function formatAuditEntry(
  timestamp: string,
  action: string,
  agentId: string,
  details: string,
): string {
  return `| ${timestamp} | ${action} | ${agentId} | ${details} |\n`;
}

/** Create audit log header */
export function createAuditLogHeader(): string {
  return `# Audit Log

| Timestamp | Action | Agent ID | Details |
|-----------|--------|----------|---------|
`;
}

/** Validate that spawn depth doesn't exceed maximum */
export function validateSpawnDepth(
  currentDepth: number,
  maxDepth: number,
): boolean {
  return currentDepth < maxDepth;
}

/** Sanitize markdown content to prevent injection */
export function sanitizeMarkdown(content: string): string {
  // Remove potential script injections while preserving markdown
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/on\w+\s*=\s*'[^']*'/gi, "");
}
