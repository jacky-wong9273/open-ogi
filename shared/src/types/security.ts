/**
 * Security types — audit, config validation, rate limiting, and request signing.
 * Inspired by openclaw's security model and trust boundaries.
 */

/** Dangerous config flag that requires explicit opt-in */
export interface DangerousConfigFlag {
  key: string;
  description: string;
  severity: "warning" | "critical";
  currentValue: unknown;
  safeValue: unknown;
}

/** Security audit result */
export interface SecurityAuditResult {
  timestamp: string;
  flags: DangerousConfigFlag[];
  score: number; // 0-100, higher = more secure
  recommendations: string[];
}

/** Per-scope rate limit configuration */
export interface RateLimitScope {
  scope: string;
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}

/** Rate limit state for a tracked entity */
export interface RateLimitState {
  scope: string;
  key: string;
  attempts: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

/** HMAC request signing for client→server trust */
export interface SignedRequest {
  payload: string;
  timestamp: number;
  signature: string;
  clientId: string;
}

/** Correlation ID for request tracing across services */
export interface CorrelationContext {
  correlationId: string;
  parentId?: string;
  source: string;
  timestamp: string;
}
