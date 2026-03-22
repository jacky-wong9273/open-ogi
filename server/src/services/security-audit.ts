import {
  runSecurityAudit,
  type SecurityAuditResult,
} from "@open-ogi/shared";
import type { Config } from "../config.js";

/**
 * Server-side security audit service.
 * Runs config-level security checks and returns actionable results.
 */
export class SecurityAuditService {
  constructor(private config: Config) {}

  /** Run a full security audit on the current config */
  audit(): SecurityAuditResult {
    return runSecurityAudit(this.config as unknown as Record<string, unknown>);
  }

  /** Check if the server is running with production-safe configuration */
  isProductionReady(): boolean {
    const result = this.audit();
    return result.flags.filter((f) => f.severity === "critical").length === 0;
  }
}
