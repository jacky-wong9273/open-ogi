import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export function AuditLogPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: () => api.monitoring.getAuditLog({ limit: "200" }),
  });

  const entries = (data?.entries ?? []) as Array<{
    timestamp: string;
    action: string;
    agentId: string;
    details: string;
    contextId?: string;
    tokenUsage?: { input: number; output: number };
  }>;

  return (
    <div>
      <div className="page-header">
        <h1>📜 Audit Log</h1>
        <span
          style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}
        >
          {data?.total ?? 0} total entries
        </span>
      </div>

      {isLoading ? (
        <div className="empty-state">Loading audit log...</div>
      ) : entries.length === 0 ? (
        <div className="empty-state">No audit entries found.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Agent</th>
              <th>Details</th>
              <th>Tokens</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: "nowrap", fontSize: "0.8125rem" }}>
                  {new Date(entry.timestamp).toLocaleString()}
                </td>
                <td>
                  <span className="badge badge-info">{entry.action}</span>
                </td>
                <td
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                  }}
                >
                  {entry.agentId?.slice(0, 8) || "—"}
                </td>
                <td
                  style={{
                    maxWidth: 400,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.details}
                </td>
                <td>
                  {entry.tokenUsage ? (
                    <span style={{ fontSize: "0.75rem" }}>
                      ↑{entry.tokenUsage.input} ↓{entry.tokenUsage.output}
                    </span>
                  ) : (
                    "—"
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
