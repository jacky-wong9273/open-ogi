import type { Request, Response, NextFunction } from "express";
import type { Config } from "../config.js";

/**
 * Security hardening middleware.
 * Enforces production-specific security policies.
 */
export function securityHardening(config: Config) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    // Content Security Policy — prevent XSS and embedding
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' ws: wss:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    );

    // Prevent MIME type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Clickjacking protection
    res.setHeader("X-Frame-Options", "DENY");

    // XSS filter
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // Referrer policy
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // Permissions policy
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=()",
    );

    next();
  };
}

/**
 * Auth-specific rate limiter that tracks per-IP failed auth attempts.
 * Locks out IPs after too many failed attempts.
 */
export class AuthRateLimiter {
  private attempts = new Map<string, { count: number; firstAt: number; lockedUntil?: number }>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly lockoutMs: number;
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(options: {
    maxAttempts?: number;
    windowMs?: number;
    lockoutMs?: number;
  } = {}) {
    this.maxAttempts = options.maxAttempts ?? 10;
    this.windowMs = options.windowMs ?? 60_000;
    this.lockoutMs = options.lockoutMs ?? 300_000;

    // Periodic cleanup of expired entries
    this.cleanupTimer = setInterval(() => this.prune(), 60_000);
  }

  /** Check if the IP is allowed to attempt auth */
  isAllowed(ip: string): boolean {
    const entry = this.attempts.get(ip);
    if (!entry) return true;

    // Check lockout
    if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
      return false;
    }

    // Check window expiry
    if (Date.now() - entry.firstAt > this.windowMs) {
      this.attempts.delete(ip);
      return true;
    }

    return entry.count < this.maxAttempts;
  }

  /** Record a failed auth attempt */
  recordFailure(ip: string): void {
    const entry = this.attempts.get(ip);
    if (!entry || Date.now() - entry.firstAt > this.windowMs) {
      this.attempts.set(ip, { count: 1, firstAt: Date.now() });
      return;
    }

    entry.count++;
    if (entry.count >= this.maxAttempts) {
      entry.lockedUntil = Date.now() + this.lockoutMs;
    }
  }

  /** Record a successful auth (resets the counter) */
  recordSuccess(ip: string): void {
    this.attempts.delete(ip);
  }

  /** Get remaining lockout time in ms (0 if not locked) */
  getLockoutRemaining(ip: string): number {
    const entry = this.attempts.get(ip);
    if (!entry?.lockedUntil) return 0;
    const remaining = entry.lockedUntil - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  private prune(): void {
    const now = Date.now();
    for (const [ip, entry] of this.attempts) {
      if (entry.lockedUntil && now > entry.lockedUntil) {
        this.attempts.delete(ip);
      } else if (now - entry.firstAt > this.windowMs * 2) {
        this.attempts.delete(ip);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
  }
}
