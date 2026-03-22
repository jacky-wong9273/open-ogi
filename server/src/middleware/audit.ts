import type { Request, Response, NextFunction } from "express";
import type { AuditService } from "../services/audit.js";

export function createAuditMiddleware(auditService: AuditService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    const originalEnd = res.end;

    // Override res.end to capture the response
    res.end = function (...args: Parameters<typeof originalEnd>) {
      const duration = Date.now() - start;
      const userId = req.user?.id ?? "anonymous";

      // Log state-changing operations (fire-and-forget)
      if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
        void auditService.log({
          agentId: "",
          userId,
          action: `http_${req.method.toLowerCase()}`,
          details: `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
          ipAddress: req.ip ?? req.socket.remoteAddress ?? "",
          resourceType: extractResourceType(req.path),
          resourceId: extractResourceId(req.path),
        });
      }

      return originalEnd.apply(res, args);
    } as typeof originalEnd;

    next();
  };
}

function extractResourceType(path: string): string {
  const parts = path.split("/").filter(Boolean);
  // /api/agents/xxx -> 'agent'
  if (parts.length >= 2 && parts[0] === "api") {
    const resource = parts[1];
    if (resource.endsWith("s")) return resource.slice(0, -1);
    return resource;
  }
  return "";
}

function extractResourceId(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length >= 3) return parts[2];
  return "";
}
