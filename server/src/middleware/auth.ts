import type { Request, Response, NextFunction } from "express";
import type { AuthService } from "../services/auth.js";
import type { User } from "@open-ogi/shared";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function createAuthMiddleware(authService: AuthService) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const token = authHeader.slice(7);
    const payload = authService.verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const user = await authService.getUserById(payload.userId);
    if (!user || !user.isActive) {
      res.status(401).json({ error: "User not found or deactivated" });
      return;
    }

    req.user = user;
    next();
  };
}
