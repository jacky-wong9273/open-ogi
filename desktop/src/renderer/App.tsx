import React from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      style={{ fontWeight: active ? "bold" : "normal", marginRight: "1rem" }}
    >
      {children}
    </Link>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <nav
        style={{
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #ddd",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <strong style={{ marginRight: "1.5rem" }}>Open-OGI</strong>
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/agents">Agents</NavLink>
        <NavLink to="/config">Config</NavLink>
        <NavLink to="/audit">Audit Log</NavLink>
      </nav>
      <main style={{ flex: 1, padding: "1rem", overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}

declare global {
  interface Window {
    ogiApi: import("../preload/index.js").OgiApi;
  }
}

function DashboardPage() {
  return (
    <div>
      <h2>Dashboard</h2>
      <p>
        Welcome to Open-OGI Desktop. Use the navigation above to manage agents,
        configure settings, and view audit logs.
      </p>
    </div>
  );
}

function AgentsPage() {
  const [agents, setAgents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    window.ogiApi.agents.list().then((list: any[]) => {
      setAgents(list);
      setLoading(false);
    });
  }, []);

  if (loading) return <p>Loading agents...</p>;

  return (
    <div>
      <h2>Local Agents</h2>
      {agents.length === 0 ? (
        <p>No agents configured yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "0.5rem",
                }}
              >
                Name
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "0.5rem",
                }}
              >
                Source
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "0.5rem",
                }}
              >
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a: any) => (
              <tr key={a.id}>
                <td
                  style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}
                >
                  {a.name}
                </td>
                <td
                  style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}
                >
                  {a.source}
                </td>
                <td
                  style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}
                >
                  {a.created_at}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ConfigPage() {
  const [config, setConfig] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    window.ogiApi.config.getAll().then((all: Record<string, string>) => {
      setConfig(all);
      setLoading(false);
    });
  }, []);

  if (loading) return <p>Loading configuration...</p>;

  return (
    <div>
      <h2>Configuration</h2>
      {Object.keys(config).length === 0 ? (
        <p>No configuration set. Default settings will be used.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "0.5rem",
                }}
              >
                Key
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "0.5rem",
                }}
              >
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(config).map(([key, value]) => (
              <tr key={key}>
                <td
                  style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}
                >
                  {key}
                </td>
                <td
                  style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}
                >
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AuditPage() {
  const [entries, setEntries] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    window.ogiApi.monitor.auditLog(100).then((list: any[]) => {
      setEntries(list);
      setLoading(false);
    });
  }, []);

  if (loading) return <p>Loading audit log...</p>;

  return (
    <div>
      <h2>Audit Log</h2>
      {entries.length === 0 ? (
        <p>No audit log entries.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "0.5rem",
                }}
              >
                Timestamp
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "0.5rem",
                }}
              >
                Event
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "0.5rem",
                }}
              >
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e: any, i: number) => (
              <tr key={i}>
                <td
                  style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}
                >
                  {e.timestamp}
                </td>
                <td
                  style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}
                >
                  {e.event_type}
                </td>
                <td
                  style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}
                >
                  {e.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
