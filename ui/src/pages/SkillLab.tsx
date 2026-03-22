import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useEnvironment } from "../hooks/useEnvironment";

type Skill = {
  id: string;
  name: string;
  description: string;
  skillMd: string;
  isPublic: boolean;
  updatedAt: string;
};

export function SkillLabPage() {
  const { currentEnv } = useEnvironment();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ["skills", currentEnv],
    queryFn: () => api.skills.list(currentEnv),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.skills.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skills"] }),
  });

  return (
    <div>
      <div className="page-header">
        <h1>Skills Lab</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? "Cancel" : "+ New Skill"}
        </button>
      </div>

      {showCreate && (
        <CreateSkillForm env={currentEnv} onDone={() => setShowCreate(false)} />
      )}

      {isLoading ? (
        <div className="empty-state">Loading skills...</div>
      ) : (skills as unknown[]).length === 0 ? (
        <div className="empty-state">
          No skills defined. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-3">
          {(skills as Skill[]).map((skill) => (
            <div key={skill.id}>
              {editingId === skill.id ? (
                <EditSkillForm
                  skill={skill}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <div className="card">
                  <div className="card-header">
                    <h3>{skill.name}</h3>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => setEditingId(skill.id)}
                        style={{
                          padding: "0.25rem 0.5rem",
                          fontSize: "0.75rem",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => deleteMutation.mutate(skill.id)}
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
                    {skill.description}
                  </p>
                  <div
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "0.75rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {skill.isPublic && (
                      <span
                        className="badge badge-info"
                        style={{ marginRight: "0.5rem" }}
                      >
                        Public
                      </span>
                    )}
                    Updated: {new Date(skill.updatedAt).toLocaleDateString()}
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

function CreateSkillForm({ env, onDone }: { env: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    description: "",
    skillMd: "",
    isPublic: false,
  });

  const mutation = useMutation({
    mutationFn: () => api.skills.create({ ...form, environment: env }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      onDone();
    },
  });

  return (
    <div className="card" style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ marginBottom: "1rem" }}>Create Skill</h3>
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
        <label>SKILL.md</label>
        <textarea
          value={form.skillMd}
          onChange={(e) => setForm((f) => ({ ...f, skillMd: e.target.value }))}
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
        disabled={!form.name || !form.skillMd}
      >
        Create Skill
      </button>
    </div>
  );
}

function EditSkillForm({
  skill,
  onDone,
}: {
  skill: Skill;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: skill.name,
    description: skill.description,
    skillMd: skill.skillMd ?? "",
    isPublic: skill.isPublic,
  });

  const mutation = useMutation({
    mutationFn: () => api.skills.update(skill.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      onDone();
    },
  });

  return (
    <div className="card" style={{ border: "2px solid var(--color-primary)" }}>
      <h3 style={{ marginBottom: "1rem" }}>Edit Skill: {skill.name}</h3>
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
        <label>SKILL.md</label>
        <textarea
          value={form.skillMd}
          onChange={(e) => setForm((f) => ({ ...f, skillMd: e.target.value }))}
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
