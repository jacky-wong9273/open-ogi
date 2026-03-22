import type { Request, Response, NextFunction } from "express";
import { createCorrelationContext } from "@open-ogi/shared";

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

/**
 * Middleware that assigns a correlation ID to every request.
 * If the client sends X-Correlation-ID, it's used; otherwise a new one is generated.
 * The ID is echoed back in the response header for tracing.
 */
export function correlationMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.headers["x-correlation-id"];
    const ctx = createCorrelationContext(
      "gateway",
      typeof clientId === "string" ? clientId : undefined,
    );

    req.correlationId = ctx.correlationId;
    res.setHeader("X-Correlation-ID", ctx.correlationId);
    next();
  };
}
