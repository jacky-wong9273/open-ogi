import React, { type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useEnvironment } from "../hooks/useEnvironment";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { currentEnv, setCurrentEnv, environments } = useEnvironment();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">🧠 Open-OGI</div>
        <nav>
          <ul className="sidebar-nav">
            <li>
              <NavLink to="/" end>
                📊 Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/agents">🤖 Agent Lab</NavLink>
            </li>
            <li>
              <NavLink to="/skills">📋 Skills Lab</NavLink>
            </li>
            <li>
              <NavLink to="/tools">🔧 Tools Lab</NavLink>
            </li>
            <li>
              <NavLink to="/monitor">📡 Agent Monitor</NavLink>
            </li>
            <li>
              <NavLink to="/tokens">💰 Token Usage</NavLink>
            </li>
            <li>
              <NavLink to="/audit">📜 Audit Log</NavLink>
            </li>
            {user?.role === "admin" && (
              <li>
                <NavLink to="/admin">⚙️ Admin</NavLink>
              </li>
            )}
          </ul>
        </nav>
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <div className="env-selector">
            <span
              style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}
            >
              ENV:
            </span>
            <select
              value={currentEnv}
              onChange={(e) => setCurrentEnv(e.target.value)}
            >
              {environments.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
          </div>
          <div
            style={{
              marginTop: "0.75rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.8125rem",
                color: "var(--color-text-muted)",
              }}
            >
              {user?.username}
            </span>
            <button
              className="btn"
              onClick={logout}
              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
