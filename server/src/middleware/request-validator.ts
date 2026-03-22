import type { Request, Response, NextFunction } from "express";
import type { ZodSchema, ZodError } from "zod";

/**
 * Middleware factory that validates req.body against a Zod schema.
 * Rejects with 400 and descriptive error messages if validation fails.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = formatZodErrors(result.error);
      res.status(400).json({
        error: "Validation failed",
        details: errors,
      });
      return;
    }

    // Replace body with parsed (and coerced/defaulted) data
    req.body = result.data;
    next();
  };
}

/**
 * Middleware factory that validates req.query against a Zod schema.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = formatZodErrors(result.error);
      res.status(400).json({
        error: "Query validation failed",
        details: errors,
      });
      return;
    }

    req.query = result.data;
    next();
  };
}

function formatZodErrors(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}
