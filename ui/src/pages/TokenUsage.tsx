import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export function TokenUsagePage() {
  const [days, setDays] = useState(7);
  const startDate = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date().toISOString();

  const { data: report, isLoading } = useQuery({
    queryKey: ["token-report", days],
    queryFn: () => api.monitoring.getTokenReport(startDate, endDate),
  });

  const typed = report as
    | {
        totalTokens: number;
        totalCost: number;
        timeline: Array<{
          timestamp: string;
          totalTokens: number;
          cost: number;
        }>;
        byAgent: Array<{
          entityId: string;
          entityName: string;
          totalTokens: number;
          totalCost: number;
          invocationCount: number;
        }>;
        bySkill: Array<{
          entityId: string;
          entityName: string;
          totalTokens: number;
          totalCost: number;
          invocationCount: number;
        }>;
        byTool: Array<{
          entityId: string;
          entityName: string;
          totalTokens: number;
          totalCost: number;
          invocationCount: number;
        }>;
      }
    | undefined;

  return (
    <div>
      <div className="page-header">
        <h1>💰 Token Usage</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {[1, 7, 30].map((d) => (
            <button
              key={d}
              className={`btn ${days === d ? "btn-primary" : ""}`}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state">Loading token data...</div>
      ) : !typed ? (
        <div className="empty-state">No data available</div>
      ) : (
        <>
          <div className="grid grid-2" style={{ marginBottom: "2rem" }}>
            <div className="stat-card">
              <div className="label">Total Tokens ({days}d)</div>
              <div className="value">{typed.totalTokens.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total Cost ({days}d)</div>
              <div className="value">${typed.totalCost.toFixed(4)}</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ marginBottom: "1rem" }}>Token Usage Timeline</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={typed.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2e3d" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#8b8fa3"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) =>
                    new Date(v).toLocaleDateString()
                  }
                />
                <YAxis stroke="#8b8fa3" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#1a1d28",
                    border: "1px solid #2a2e3d",
                    borderRadius: 8,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="totalTokens"
                  stroke="#6366f1"
                  strokeWidth={2}
                  name="Tokens"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-3">
            <div className="card">
              <h3 style={{ marginBottom: "1rem" }}>By Agent</h3>
              {typed.byAgent.length === 0 ? (
                <div className="empty-state">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={typed.byAgent.slice(0, 5)}>
                    <XAxis
                      dataKey="entityName"
                      stroke="#8b8fa3"
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis stroke="#8b8fa3" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1d28",
                        border: "1px solid #2a2e3d",
                        borderRadius: 8,
                      }}
                    />
                    <Bar
                      dataKey="totalTokens"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                      name="Tokens"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginBottom: "1rem" }}>By Skill</h3>
              {typed.bySkill.length === 0 ? (
                <div className="empty-state">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={typed.bySkill.slice(0, 5)}>
                    <XAxis
                      dataKey="entityName"
                      stroke="#8b8fa3"
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis stroke="#8b8fa3" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1d28",
                        border: "1px solid #2a2e3d",
                        borderRadius: 8,
                      }}
                    />
                    <Bar
                      dataKey="totalTokens"
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]}
                      name="Tokens"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginBottom: "1rem" }}>By Tool</h3>
              {typed.byTool.length === 0 ? (
                <div className="empty-state">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={typed.byTool.slice(0, 5)}>
                    <XAxis
                      dataKey="entityName"
                      stroke="#8b8fa3"
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis stroke="#8b8fa3" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1d28",
                        border: "1px solid #2a2e3d",
                        borderRadius: 8,
                      }}
                    />
                    <Bar
                      dataKey="totalTokens"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                      name="Tokens"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
