/** User types with RBAC */
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

export type UserRole = "admin" | "manager" | "operator" | "viewer";

export interface Permission {
  resource: ResourceType;
  actions: PermissionAction[];
  scope?: string; // environment or resource ID
}

export type ResourceType =
  | "agent"
  | "skill"
  | "tool"
  | "user"
  | "environment"
  | "system";
export type PermissionAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "execute"
  | "share";

/** Role permission matrix */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    {
      resource: "agent",
      actions: ["create", "read", "update", "delete", "execute", "share"],
    },
    {
      resource: "skill",
      actions: ["create", "read", "update", "delete", "execute", "share"],
    },
    {
      resource: "tool",
      actions: ["create", "read", "update", "delete", "execute", "share"],
    },
    { resource: "user", actions: ["create", "read", "update", "delete"] },
    {
      resource: "environment",
      actions: ["create", "read", "update", "delete"],
    },
    { resource: "system", actions: ["create", "read", "update", "delete"] },
  ],
  manager: [
    {
      resource: "agent",
      actions: ["create", "read", "update", "delete", "execute", "share"],
    },
    {
      resource: "skill",
      actions: ["create", "read", "update", "delete", "execute", "share"],
    },
    {
      resource: "tool",
      actions: ["create", "read", "update", "delete", "execute", "share"],
    },
    { resource: "user", actions: ["read"] },
    { resource: "environment", actions: ["read"] },
  ],
  operator: [
    { resource: "agent", actions: ["read", "execute"] },
    { resource: "skill", actions: ["read", "execute"] },
    { resource: "tool", actions: ["read", "execute"] },
  ],
  viewer: [
    { resource: "agent", actions: ["read"] },
    { resource: "skill", actions: ["read"] },
    { resource: "tool", actions: ["read"] },
  ],
};

/** Authentication session */
export interface AuthSession {
  userId: string;
  token: string;
  expiresAt: string;
  refreshToken: string;
}

/** Login credentials */
export interface LoginCredentials {
  username: string;
  password: string;
}
