import type { Request, Response, NextFunction } from "express";
import {
  ROLE_PERMISSIONS,
  type ResourceType,
  type PermissionAction,
  type UserRole,
} from "@open-ogi/shared";

export function requirePermission(
  resource: ResourceType,
  action: PermissionAction,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const role = req.user.role as UserRole;
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    const hasPermission = permissions.some(
      (p) => p.resource === resource && p.actions.includes(action),
    );

    if (!hasPermission) {
      res
        .status(403)
        .json({ error: `Insufficient permissions: ${action} on ${resource}` });
      return;
    }

    next();
  };
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({ error: "Insufficient role" });
      return;
    }

    next();
  };
}
