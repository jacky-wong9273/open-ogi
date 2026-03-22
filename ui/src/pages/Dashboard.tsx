import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { useEnvironment } from "../hooks/useEnvironment";

export function DashboardPage() {
  const { currentEnv } = useEnvironment();

  const { data: agents = [] } = useQuery({
    queryKey: ["agents", currentEnv],
    queryFn: () => api.agents.list(currentEnv),
  });
  const { data: skills = [] } = useQuery({
    queryKey: ["skills", currentEnv],
    queryFn: () => api.skills.list(currentEnv),
  });
  const { data: tools = [] } = useQuery({
    queryKey: ["tools", currentEnv],
    queryFn: () => api.tools.list(currentEnv),
  });
  const { data: realizedAgents = [] } = useQuery({
    queryKey: ["realized-agents", currentEnv],
    queryFn: () => api.realizedAgents.list({ environment: currentEnv }),
  });

  const runningAgents = (realizedAgents as Array<{ status: string }>).filter(
    (a) => a.status === "running",
  ).length;
  const tokenReport = useQuery({
    queryKey: ["token-report"],
    queryFn: () => api.monitoring.getTokenReport(),
  });

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <span className="badge badge-info">{currentEnv}</span>
      </div>

      <div className="grid grid-4" style={{ marginBottom: "2rem" }}>
        <div className="stat-card">
          <div className="label">Abstract Agents</div>
          <div className="value">{(agents as unknown[]).length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Skills</div>
          <div className="value">{(skills as unknown[]).length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Tools</div>
          <div className="value">{(tools as unknown[]).length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Running Agents</div>
          <div
            className="value"
            style={{
              color: runningAgents > 0 ? "var(--color-success)" : undefined,
            }}
          >
            {runningAgents}
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>Active Agents</h3>
          {(
            realizedAgents as Array<{
              id: string;
              name: string;
              status: string;
              type: string;
            }>
          ).length === 0 ? (
            <div className="empty-state">No realized agents deployed</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {(
                  realizedAgents as Array<{
                    id: string;
                    name: string;
                    status: string;
                    type: string;
                  }>
                )
                  .slice(0, 10)
                  .map((a) => (
                    <tr key={a.id}>
                      <td>{a.name}</td>
                      <td>
                        <span
                          className={`badge badge-${a.status === "running" ? "success" : a.status === "error" ? "error" : "warning"}`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td>{a.type}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>Token Usage Summary</h3>
          {tokenReport.data ? (
            <div>
              <div className="stat-card" style={{ marginBottom: "0.5rem" }}>
                <div className="label">Total Tokens (7d)</div>
                <div className="value">
                  {(
                    (tokenReport.data as { totalTokens: number }).totalTokens ??
                    0
                  ).toLocaleString()}
                </div>
              </div>
              <div className="stat-card">
                <div className="label">Total Cost (7d)</div>
                <div className="value">
                  $
                  {(
                    (tokenReport.data as { totalCost: number }).totalCost ?? 0
                  ).toFixed(4)}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">Loading...</div>
          )}
        </div>
      </div>
    </div>
  );
}
