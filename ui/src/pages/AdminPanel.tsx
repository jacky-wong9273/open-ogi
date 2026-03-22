import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";

export function AdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.auth.listUsers(),
  });

  const promptQuery = useQuery({
    queryKey: ["system-prompt"],
    queryFn: () => api.admin.getSystemPrompt(),
    enabled: user?.role === "admin",
  });

  useEffect(() => {
    if (promptQuery.data) {
      setSystemPrompt(promptQuery.data.prompt ?? "");
    }
  }, [promptQuery.data]);

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.auth.updateUserRole(userId, role),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const toggleActive = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.auth.updateUserRole(userId, role),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const savePrompt = useMutation({
    mutationFn: () => api.admin.updateSystemPrompt(systemPrompt),
    onSuccess: () => alert("System prompt updated."),
  });

  const users = (usersQuery.data ?? []) as Array<{
    id: string;
    username: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  }>;

  const roles = ["admin", "manager", "operator", "viewer"];

  return (
    <div>
      <div className="page-header">
        <h1>Admin Panel</h1>
      </div>

      {/* System Prompt Override */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header">
          <h2>Default System Prompt</h2>
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: "0.8125rem",
              margin: "0.25rem 0 0",
            }}
          >
            Override the default system prompt injected into all realized
            agents.
          </p>
        </div>
        <div className="card-body">
          <textarea
            className="input"
            rows={8}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter default system prompt..."
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.8125rem",
              resize: "vertical",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "0.75rem",
            }}
          >
            <button
              className="btn btn-primary"
              onClick={() => savePrompt.mutate()}
              disabled={savePrompt.isPending}
            >
              {savePrompt.isPending ? "Saving..." : "Save System Prompt"}
            </button>
          </div>
        </div>
      </div>

      {/* User Management */}
      <div className="card">
        <div className="card-header">
          <h2>User Management</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateUser(!showCreateUser)}
          >
            {showCreateUser ? "Cancel" : "+ New User"}
          </button>
        </div>
        <div className="card-body">
          {showCreateUser && (
            <CreateUserForm onDone={() => setShowCreateUser(false)} />
          )}
          {usersQuery.isLoading ? (
            <div className="empty-state">Loading users...</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td style={{ fontSize: "0.8125rem" }}>{u.email}</td>
                    <td>
                      <select
                        className="input"
                        style={{
                          width: "auto",
                          padding: "0.25rem 0.5rem",
                          fontSize: "0.8125rem",
                        }}
                        value={u.role}
                        onChange={(e) =>
                          updateRole.mutate({
                            userId: u.id,
                            role: e.target.value,
                          })
                        }
                        disabled={u.id === user?.id}
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span
                        className={`badge ${u.isActive ? "badge-success" : "badge-error"}`}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8125rem" }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      {u.id !== user?.id && (
                        <button
                          className="btn btn-sm"
                          onClick={() =>
                            toggleActive.mutate({
                              userId: u.id,
                              role: u.isActive ? "viewer" : u.role,
                            })
                          }
                          title="Toggle active state"
                        >
                          {u.isActive ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "viewer" as string,
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.auth.createUser(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      onDone();
    },
    onError: (err: Error) => setError(err.message),
  });

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <div
      style={{
        marginBottom: "1.5rem",
        padding: "1rem",
        border: "1px solid var(--color-border)",
        borderRadius: "0.5rem",
      }}
    >
      <h3 style={{ marginBottom: "1rem" }}>Create New User</h3>
      <div className="grid grid-2">
        <div className="form-group">
          <label>Username</label>
          <input
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
            placeholder="e.g. johndoe"
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="john@example.com"
          />
        </div>
      </div>
      <div className="grid grid-2">
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder="Min. 8 characters"
          />
        </div>
        <div className="form-group">
          <label>Role</label>
          <select
            className="input"
            value={form.role}
            onChange={(e) => update("role", e.target.value)}
          >
            <option value="viewer">Viewer</option>
            <option value="operator">Operator</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      {error && (
        <p
          style={{
            color: "var(--color-error)",
            fontSize: "0.875rem",
            marginBottom: "0.5rem",
          }}
        >
          {error}
        </p>
      )}
      <button
        className="btn btn-primary"
        onClick={() => mutation.mutate()}
        disabled={
          !form.username || !form.email || !form.password || mutation.isPending
        }
      >
        {mutation.isPending ? "Creating..." : "Create User"}
      </button>
    </div>
  );
}
