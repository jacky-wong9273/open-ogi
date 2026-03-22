import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useEnvironment } from "../hooks/useEnvironment";

type Tool = {
  id: string;
  name: string;
  description: string;
  toolMd: string;
  isPublic: boolean;
  updatedAt: string;
  scripts: unknown[];
};

export function ToolLabPage() {
  const { currentEnv } = useEnvironment();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ["tools", currentEnv],
    queryFn: () => api.tools.list(currentEnv),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.tools.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tools"] }),
  });

  return (
    <div>
      <div className="page-header">
        <h1>Tools Lab</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? "Cancel" : "+ New Tool"}
        </button>
      </div>

      {showCreate && (
        <CreateToolForm env={currentEnv} onDone={() => setShowCreate(false)} />
      )}

      {isLoading ? (
        <div className="empty-state">Loading tools...</div>
      ) : (tools as unknown[]).length === 0 ? (
        <div className="empty-state">
          No tools defined. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-3">
          {(tools as Tool[]).map((tool) => (
            <div key={tool.id}>
              {editingId === tool.id ? (
                <EditToolForm tool={tool} onDone={() => setEditingId(null)} />
              ) : (
                <div className="card">
                  <div className="card-header">
                    <h3>{tool.name}</h3>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => setEditingId(tool.id)}
                        style={{
                          padding: "0.25rem 0.5rem",
                          fontSize: "0.75rem",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => deleteMutation.mutate(tool.id)}
                        style={{
                          padding: "0.25rem 0.5rem",
                          fontSize: "0.75rem",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p
                    style={{
                      color: "var(--color-text-muted)",
                      fontSize: "0.875rem",
                    }}
                  >
                    {tool.description}
                  </p>
                  <div
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "0.75rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {tool.isPublic && (
                      <span
                        className="badge badge-info"
                        style={{ marginRight: "0.5rem" }}
                      >
                        Public
                      </span>
                    )}
                    Scripts: {tool.scripts?.length ?? 0} · Updated:{" "}
                    {new Date(tool.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateToolForm({ env, onDone }: { env: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    description: "",
    toolMd: "",
    isPublic: false,
  });

  const mutation = useMutation({
    mutationFn: () => api.tools.create({ ...form, environment: env }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      onDone();
    },
  });

  return (
    <div className="card" style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ marginBottom: "1rem" }}>Create Tool</h3>
      <div className="grid grid-2">
        <div className="form-group">
          <label>Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <input
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>
      </div>
      <div className="form-group">
        <label>TOOL.md</label>
        <textarea
          value={form.toolMd}
          onChange={(e) => setForm((f) => ({ ...f, toolMd: e.target.value }))}
        />
      </div>
      <div className="form-group" style={{ marginBottom: "1rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) =>
              setForm((f) => ({ ...f, isPublic: e.target.checked }))
            }
            style={{ width: "auto" }}
          />
          Public (visible to all users)
        </label>
      </div>
      <button
        className="btn btn-primary"
        onClick={() => mutation.mutate()}
        disabled={!form.name || !form.toolMd}
      >
        Create Tool
      </button>
    </div>
  );
}

function EditToolForm({ tool, onDone }: { tool: Tool; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: tool.name,
    description: tool.description,
    toolMd: tool.toolMd ?? "",
    isPublic: tool.isPublic,
  });

  const mutation = useMutation({
    mutationFn: () => api.tools.update(tool.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      onDone();
    },
  });

  return (
    <div className="card" style={{ border: "2px solid var(--color-primary)" }}>
      <h3 style={{ marginBottom: "1rem" }}>Edit Tool: {tool.name}</h3>
      <div className="grid grid-2">
        <div className="form-group">
          <label>Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <input
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>
      </div>
      <div className="form-group">
        <label>TOOL.md</label>
        <textarea
          value={form.toolMd}
          onChange={(e) => setForm((f) => ({ ...f, toolMd: e.target.value }))}
        />
      </div>
      <div className="form-group" style={{ marginBottom: "1rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) =>
              setForm((f) => ({ ...f, isPublic: e.target.checked }))
            }
            style={{ width: "auto" }}
          />
          Public (visible to all users)
        </label>
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          className="btn btn-primary"
          onClick={() => mutation.mutate()}
          disabled={!form.name}
        >
          {mutation.isPending ? "Saving..." : "Save Changes"}
        </button>
        <button className="btn" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}
