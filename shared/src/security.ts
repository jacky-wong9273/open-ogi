import { createHmac, timingSafeEqual } from "node:crypto";
import { generateId, now } from "./utils.js";
import type {
  DangerousConfigFlag,
  SecurityAuditResult,
  SignedRequest,
  CorrelationContext,
} from "./types/security.js";

/**
 * Detect dangerous configuration flags.
 * Returns an array of flags that should be reviewed.
 */
export function detectDangerousFlags(
  config: Record<string, unknown>,
): DangerousConfigFlag[] {
  const flags: DangerousConfigFlag[] = [];

  // Weak JWT secret
  const jwtSecret = config.JWT_SECRET as string | undefined;
  if (
    jwtSecret &&
    (jwtSecret.length < 32 || jwtSecret.includes("change-me"))
  ) {
    flags.push({
      key: "JWT_SECRET",
      description:
        "JWT secret is weak or uses a default value. Use a random 64+ character string.",
      severity: "critical",
      currentValue: "[REDACTED]",
      safeValue: "<random 64+ char string>",
    });
  }

  // Default admin password
  const adminPw = config.ADMIN_PASSWORD as string | undefined;
  if (
    adminPw &&
    (adminPw === "admin1234" || adminPw.length < 12)
  ) {
    flags.push({
      key: "ADMIN_PASSWORD",
      description:
        "Admin password is weak or uses a default value. Use a strong password.",
      severity: "critical",
      currentValue: "[REDACTED]",
      safeValue: "<strong password 12+ chars>",
    });
  }

  // CORS wildcard
  const corsOrigin = config.CORS_ORIGIN as string | undefined;
  if (corsOrigin === "*") {
    flags.push({
      key: "CORS_ORIGIN",
      description:
        "CORS allows all origins. Restrict to your known frontend domains.",
      severity: "warning",
      currentValue: "*",
      safeValue: "https://your-domain.com",
    });
  }

  // LOG_LEVEL=debug in production
  const nodeEnv = config.NODE_ENV as string | undefined;
  const logLevel = config.LOG_LEVEL as string | undefined;
  if (nodeEnv === "production" && logLevel === "debug") {
    flags.push({
      key: "LOG_LEVEL",
      description:
        "Debug logging in production may expose sensitive data. Use 'info' or 'warn'.",
      severity: "warning",
      currentValue: "debug",
      safeValue: "info",
    });
  }

  // High rate limit
  const rateMax = config.RATE_LIMIT_MAX_REQUESTS as number | undefined;
  if (rateMax && rateMax > 500) {
    flags.push({
      key: "RATE_LIMIT_MAX_REQUESTS",
      description:
        "Very high rate limit may allow abuse. Consider 100-200 per window.",
      severity: "warning",
      currentValue: rateMax,
      safeValue: 100,
    });
  }

  return flags;
}

/**
 * Run a full security audit on the given config.
 */
export function runSecurityAudit(
  config: Record<string, unknown>,
): SecurityAuditResult {
  const flags = detectDangerousFlags(config);
  const criticalCount = flags.filter((f) => f.severity === "critical").length;
  const warningCount = flags.filter((f) => f.severity === "warning").length;

  // Score: Start at 100, deduct for issues
  const score = Math.max(0, 100 - criticalCount * 25 - warningCount * 10);

  const recommendations: string[] = [];
  if (criticalCount > 0) {
    recommendations.push(
      "CRITICAL: Address all critical security flags before deploying to production.",
    );
  }
  if (!config.NODE_ENV || config.NODE_ENV !== "production") {
    recommendations.push(
      "Set NODE_ENV=production for production deployments to enable security hardening.",
    );
  }
  if (!config.RATE_LIMIT_MAX_REQUESTS) {
    recommendations.push(
      "Configure rate limiting to prevent abuse.",
    );
  }

  return {
    timestamp: now(),
    flags,
    score,
    recommendations,
  };
}

/**
 * Create an HMAC-SHA256 signed request for trusted client→server communication.
 */
export function signRequest(
  payload: string,
  secret: string,
  clientId: string,
): SignedRequest {
  const timestamp = Date.now();
  const message = `${timestamp}.${clientId}.${payload}`;
  const signature = createHmac("sha256", secret).update(message).digest("hex");

  return {
    payload,
    timestamp,
    signature,
    clientId,
  };
}

/**
 * Verify an HMAC-SHA256 signed request. Rejects if timestamp is stale (>5min).
 */
export function verifySignedRequest(
  request: SignedRequest,
  secret: string,
  maxAgeMs: number = 5 * 60 * 1000,
): boolean {
  // Check timestamp freshness
  const age = Date.now() - request.timestamp;
  if (age > maxAgeMs || age < 0) {
    return false;
  }

  const message = `${request.timestamp}.${request.clientId}.${request.payload}`;
  const expected = createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  // Timing-safe comparison
  try {
    return timingSafeEqual(
      Buffer.from(request.signature, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

/**
 * Create a correlation context for request tracing.
 */
export function createCorrelationContext(
  source: string,
  parentId?: string,
): CorrelationContext {
  return {
    correlationId: generateId(),
    parentId,
    source,
    timestamp: now(),
  };
}
