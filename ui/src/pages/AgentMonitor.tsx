import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useEnvironment } from "../hooks/useEnvironment";

export function AgentMonitorPage() {
  const { currentEnv } = useEnvironment();
  const queryClient = useQueryClient();
  const [showDeploy, setShowDeploy] = useState(false);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["realized-agents", currentEnv],
    queryFn: () => api.realizedAgents.list({ environment: currentEnv }),
    refetchInterval: 5000,
  });

  const terminateMutation = useMutation({
    mutationFn: (id: string) => api.realizedAgents.terminate(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["realized-agents"] }),
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "running":
        return "success";
      case "idle":
        return "info";
      case "error":
        return "error";
      case "waiting":
        return "warning";
      default:
        return "warning";
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Agent Monitor</h1>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span
            style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}
          >
            Auto-refreshes every 5s
          </span>
          <button
            className="btn btn-primary"
            onClick={() => setShowDeploy(!showDeploy)}
          >
            {showDeploy ? "Cancel" : "Deploy Agent"}
          </button>
        </div>
      </div>

      {showDeploy && (
        <DeployAgentForm env={currentEnv} onDone={() => setShowDeploy(false)} />
      )}

      {isLoading ? (
        <div className="empty-state">Loading...</div>
      ) : (agents as unknown[]).length === 0 ? (
        <div className="empty-state">
          No realized agents running in this environment.
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Type</th>
              <th>Depth</th>
              <th>Input Tokens</th>
              <th>Output Tokens</th>
              <th>Cost</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(
              agents as Array<{
                id: string;
                name: string;
                status: string;
                type: string;
                spawnDepth: number;
                tokenUsage: {
                  totalInput: number;
                  totalOutput: number;
                  totalCost: number;
                };
                lastActiveAt: string;
              }>
            ).map((agent) => (
              <tr key={agent.id}>
                <td>
                  <strong>{agent.name}</strong>
                  {agent.type === "temporary" && (
                    <span
                      style={{
                        color: "var(--color-text-muted)",
                        fontSize: "0.75rem",
                        marginLeft: "0.5rem",
                      }}
                    >
                      (temp)
                    </span>
                  )}
                </td>
                <td>
                  <span className={`badge badge-${statusColor(agent.status)}`}>
                    {agent.status}
                  </span>
                </td>
                <td>{agent.type}</td>
                <td>{agent.spawnDepth}</td>
                <td>{agent.tokenUsage?.totalInput?.toLocaleString() ?? 0}</td>
                <td>{agent.tokenUsage?.totalOutput?.toLocaleString() ?? 0}</td>
                <td>${(agent.tokenUsage?.totalCost ?? 0).toFixed(4)}</td>
                <td
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {new Date(agent.lastActiveAt).toLocaleString()}
                </td>
                <td>
                  {agent.status !== "terminated" && (
                    <button
                      className="btn btn-danger"
                      onClick={() => terminateMutation.mutate(agent.id)}
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                    >
                      Terminate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function DeployAgentForm({ env, onDone }: { env: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState("");
  const [error, setError] = useState("");

  const { data: abstractAgents = [] } = useQuery({
    queryKey: ["agents", env],
    queryFn: () => api.agents.list(env),
  });

  const deployMutation = useMutation({
    mutationFn: () =>
      api.realizedAgents.instantiate({
        abstractAgentId: selectedAgent,
        environment: env,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["realized-agents"] });
      onDone();
    },
    onError: (err: Error) => setError(err.message),
  });

  const agents = abstractAgents as Array<{
    id: string;
    name: string;
    description: string;
  }>;

  return (
    <div className="card" style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ marginBottom: "1rem" }}>Deploy Agent</h3>
      <div className="form-group">
        <label>Select Abstract Agent</label>
        <select
          className="input"
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
        >
          <option value="">-- Select an agent --</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} {a.description ? `- ${a.description}` : ""}
            </option>
          ))}
        </select>
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
        onClick={() => deployMutation.mutate()}
        disabled={!selectedAgent || deployMutation.isPending}
      >
        {deployMutation.isPending ? "Deploying..." : "Deploy"}
      </button>
    </div>
  );
}
