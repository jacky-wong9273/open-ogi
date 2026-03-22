import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useEnvironment } from "../hooks/useEnvironment";

type Agent = {
  id: string;
  name: string;
  description: string;
  agentMd: string;
  instructionsMd: string;
  skillsMd: string;
  toolsMd: string;
  styleMd: string;
  permittedSkills: string[];
  permittedTools: string[];
  isPublic: boolean;
  updatedAt: string;
};

export function AgentLabPage() {
  const { currentEnv } = useEnvironment();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents", currentEnv],
    queryFn: () => api.agents.list(currentEnv),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.agents.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  });

  return (
    <div>
      <div className="page-header">
        <h1>Agent Lab</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? "Cancel" : "+ New Agent"}
        </button>
      </div>

      {showCreate && (
        <CreateAgentForm env={currentEnv} onDone={() => setShowCreate(false)} />
      )}

      {isLoading ? (
        <div className="empty-state">Loading agents...</div>
      ) : (agents as unknown[]).length === 0 ? (
        <div className="empty-state">
          No abstract agents defined. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-2">
          {(agents as Agent[]).map((agent) => (
            <div key={agent.id}>
              {editingId === agent.id ? (
                <EditAgentForm
                  agent={agent}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <div className="card">
                  <div className="card-header">
                    <h3>{agent.name}</h3>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {agent.isPublic && (
                        <span className="badge badge-info">Public</span>
                      )}
                      <button
                        className="btn btn-sm"
                        onClick={() => setEditingId(agent.id)}
                        style={{
                          padding: "0.25rem 0.5rem",
                          fontSize: "0.75rem",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => deleteMutation.mutate(agent.id)}
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
                      marginBottom: "0.75rem",
                    }}
                  >
                    {agent.description}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      fontSize: "0.8125rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <span>Skills: {agent.permittedSkills?.length ?? 0}</span>
                    <span>Tools: {agent.permittedTools?.length ?? 0}</span>
                    <span>
                      Updated: {new Date(agent.updatedAt).toLocaleDateString()}
                    </span>
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

function CreateAgentForm({ env, onDone }: { env: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    description: "",
    agentMd: "",
    instructionsMd: "",
    skillsMd: "",
    toolsMd: "",
    styleMd: "",
    permittedSkills: "",
    permittedTools: "",
    isPublic: false,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.agents.create({
        ...form,
        environment: env,
        permittedSkills: form.permittedSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        permittedTools: form.permittedTools
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      onDone();
    },
  });

  const update = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="card" style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ marginBottom: "1rem" }}>Create Abstract Agent</h3>
      <div className="grid grid-2">
        <div className="form-group">
          <label>Name</label>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g. Scrum Master"
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <input
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>
      </div>
      <div className="form-group">
        <label>AGENT.md (Role & Capabilities)</label>
        <textarea
          value={form.agentMd}
          onChange={(e) => update("agentMd", e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>INSTRUCTIONS.md (Must do / Must not do / SOPs)</label>
        <textarea
          value={form.instructionsMd}
          onChange={(e) => update("instructionsMd", e.target.value)}
        />
      </div>
      <div className="grid grid-2">
        <div className="form-group">
          <label>SKILLS.md</label>
          <textarea
            value={form.skillsMd}
            onChange={(e) => update("skillsMd", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>TOOLS.md</label>
          <textarea
            value={form.toolsMd}
            onChange={(e) => update("toolsMd", e.target.value)}
          />
        </div>
      </div>
      <div className="form-group">
        <label>STYLE.md (Optional)</label>
        <textarea
          value={form.styleMd}
          onChange={(e) => update("styleMd", e.target.value)}
          rows={3}
        />
      </div>
      <div className="grid grid-2">
        <div className="form-group">
          <label>Permitted Skills (comma-separated)</label>
          <input
            value={form.permittedSkills}
            onChange={(e) => update("permittedSkills", e.target.value)}
            placeholder="code-review, sprint-planning"
          />
        </div>
        <div className="form-group">
          <label>Permitted Tools (comma-separated)</label>
          <input
            value={form.permittedTools}
            onChange={(e) => update("permittedTools", e.target.value)}
            placeholder="git-operations, jira"
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <input
          type="checkbox"
          id="isPublic"
          checked={form.isPublic}
          onChange={(e) => update("isPublic", e.target.checked)}
        />
        <label htmlFor="isPublic" style={{ fontSize: "0.875rem" }}>
          Share publicly
        </label>
      </div>
      <button
        className="btn btn-primary"
        onClick={() => mutation.mutate()}
        disabled={!form.name || !form.agentMd}
      >
        Create Agent
      </button>
    </div>
  );
}

function EditAgentForm({
  agent,
  onDone,
}: {
  agent: Agent;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: agent.name,
    description: agent.description,
    agentMd: agent.agentMd ?? "",
    instructionsMd: agent.instructionsMd ?? "",
    skillsMd: agent.skillsMd ?? "",
    toolsMd: agent.toolsMd ?? "",
    styleMd: agent.styleMd ?? "",
    permittedSkills: (agent.permittedSkills ?? []).join(", "),
    permittedTools: (agent.permittedTools ?? []).join(", "),
    isPublic: agent.isPublic,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.agents.update(agent.id, {
        ...form,
        permittedSkills: form.permittedSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        permittedTools: form.permittedTools
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      onDone();
    },
  });

  const update = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="card" style={{ border: "2px solid var(--color-primary)" }}>
      <h3 style={{ marginBottom: "1rem" }}>Edit Agent: {agent.name}</h3>
      <div className="grid grid-2">
        <div className="form-group">
          <label>Name</label>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <input
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>
      </div>
      <div className="form-group">
        <label>AGENT.md</label>
        <textarea
          value={form.agentMd}
          onChange={(e) => update("agentMd", e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>INSTRUCTIONS.md</label>
        <textarea
          value={form.instructionsMd}
          onChange={(e) => update("instructionsMd", e.target.value)}
        />
      </div>
      <div className="grid grid-2">
        <div className="form-group">
          <label>Permitted Skills</label>
          <input
            value={form.permittedSkills}
            onChange={(e) => update("permittedSkills", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Permitted Tools</label>
          <input
            value={form.permittedTools}
            onChange={(e) => update("permittedTools", e.target.value)}
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <input
          type="checkbox"
          checked={form.isPublic}
          onChange={(e) => update("isPublic", e.target.checked)}
        />
        <label style={{ fontSize: "0.875rem" }}>Share publicly</label>
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
