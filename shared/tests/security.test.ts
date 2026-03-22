import { describe, it, expect } from "vitest";
import {
  detectDangerousFlags,
  runSecurityAudit,
  signRequest,
  verifySignedRequest,
  createCorrelationContext,
} from "@open-ogi/shared";

describe("Security Utilities", () => {
  describe("detectDangerousFlags", () => {
    it("flags weak JWT secret", () => {
      const flags = detectDangerousFlags({
        JWT_SECRET: "change-me-in-production-min-32-chars!!",
      });
      expect(flags).toHaveLength(1);
      expect(flags[0].key).toBe("JWT_SECRET");
      expect(flags[0].severity).toBe("critical");
    });

    it("flags short JWT secret", () => {
      const flags = detectDangerousFlags({
        JWT_SECRET: "short",
      });
      expect(flags).toHaveLength(1);
      expect(flags[0].key).toBe("JWT_SECRET");
    });

    it("flags default admin password", () => {
      const flags = detectDangerousFlags({
        ADMIN_PASSWORD: "admin1234",
      });
      expect(flags).toHaveLength(1);
      expect(flags[0].key).toBe("ADMIN_PASSWORD");
      expect(flags[0].severity).toBe("critical");
    });

    it("flags CORS wildcard", () => {
      const flags = detectDangerousFlags({
        CORS_ORIGIN: "*",
      });
      expect(flags).toHaveLength(1);
      expect(flags[0].key).toBe("CORS_ORIGIN");
    });

    it("flags debug logging in production", () => {
      const flags = detectDangerousFlags({
        NODE_ENV: "production",
        LOG_LEVEL: "debug",
      });
      expect(flags).toHaveLength(1);
      expect(flags[0].key).toBe("LOG_LEVEL");
    });

    it("returns empty for secure config", () => {
      const flags = detectDangerousFlags({
        JWT_SECRET: "a-very-long-and-secure-random-jwt-secret-string-64-chars-or-more!!",
        ADMIN_PASSWORD: "strongP@ssw0rd!!",
        CORS_ORIGIN: "https://myapp.com",
        NODE_ENV: "production",
        LOG_LEVEL: "info",
      });
      expect(flags).toHaveLength(0);
    });
  });

  describe("runSecurityAudit", () => {
    it("returns score 100 for secure config", () => {
      const result = runSecurityAudit({
        JWT_SECRET: "a-very-long-and-secure-random-jwt-secret-string-64-chars-or-more!!",
        ADMIN_PASSWORD: "strongP@ssw0rd!!",
        CORS_ORIGIN: "https://myapp.com",
        NODE_ENV: "production",
        LOG_LEVEL: "info",
        RATE_LIMIT_MAX_REQUESTS: 100,
      });
      expect(result.score).toBe(100);
      expect(result.flags).toHaveLength(0);
    });

    it("deducts for critical flags", () => {
      const result = runSecurityAudit({
        JWT_SECRET: "change-me",
        ADMIN_PASSWORD: "admin1234",
      });
      expect(result.score).toBeLessThan(51);
      expect(result.flags.length).toBeGreaterThanOrEqual(2);
    });

    it("includes recommendations", () => {
      const result = runSecurityAudit({
        JWT_SECRET: "change-me",
      });
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Request Signing (HMAC)", () => {
    const secret = "test-hmac-secret-for-signing";
    const clientId = "test-client-001";
    const payload = JSON.stringify({ type: "token_usage", amount: 100 });

    it("signs and verifies a request", () => {
      const signed = signRequest(payload, secret, clientId);
      expect(signed.payload).toBe(payload);
      expect(signed.clientId).toBe(clientId);
      expect(signed.signature).toMatch(/^[0-9a-f]{64}$/);

      const valid = verifySignedRequest(signed, secret);
      expect(valid).toBe(true);
    });

    it("rejects tampered payload", () => {
      const signed = signRequest(payload, secret, clientId);
      signed.payload = '{"type":"hacked"}';
      expect(verifySignedRequest(signed, secret)).toBe(false);
    });

    it("rejects wrong secret", () => {
      const signed = signRequest(payload, secret, clientId);
      expect(verifySignedRequest(signed, "wrong-secret")).toBe(false);
    });

    it("rejects stale timestamps", () => {
      const signed = signRequest(payload, secret, clientId);
      signed.timestamp = Date.now() - 10 * 60 * 1000; // 10 min ago
      expect(verifySignedRequest(signed, secret, 5 * 60 * 1000)).toBe(false);
    });

    it("rejects future timestamps", () => {
      const signed = signRequest(payload, secret, clientId);
      signed.timestamp = Date.now() + 10 * 60 * 1000; // 10 min in future
      expect(verifySignedRequest(signed, secret, 5 * 60 * 1000)).toBe(false);
    });
  });

  describe("Correlation Context", () => {
    it("creates context with unique ID", () => {
      const ctx1 = createCorrelationContext("gateway");
      const ctx2 = createCorrelationContext("gateway");
      expect(ctx1.correlationId).not.toBe(ctx2.correlationId);
      expect(ctx1.source).toBe("gateway");
      expect(ctx1.parentId).toBeUndefined();
    });

    it("preserves parent ID", () => {
      const ctx = createCorrelationContext("agent", "parent-123");
      expect(ctx.parentId).toBe("parent-123");
    });

    it("includes timestamp", () => {
      const ctx = createCorrelationContext("test");
      expect(ctx.timestamp).toBeDefined();
      expect(new Date(ctx.timestamp).getTime()).toBeGreaterThan(0);
    });
  });
});
