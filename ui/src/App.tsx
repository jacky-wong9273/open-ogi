import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { EnvironmentProvider } from "./hooks/useEnvironment";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { AgentLabPage } from "./pages/AgentLab";
import { SkillLabPage } from "./pages/SkillLab";
import { ToolLabPage } from "./pages/ToolLab";
import { AgentMonitorPage } from "./pages/AgentMonitor";
import { TokenUsagePage } from "./pages/TokenUsage";
import { AdminPage } from "./pages/AdminPanel";
import { AuditLogPage } from "./pages/AuditLog";

function RequireRole({
  role,
  children,
}: {
  role: string;
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function ProtectedRoutes() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="empty-state">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <EnvironmentProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/agents" element={<AgentLabPage />} />
          <Route path="/skills" element={<SkillLabPage />} />
          <Route path="/tools" element={<ToolLabPage />} />
          <Route path="/monitor" element={<AgentMonitorPage />} />
          <Route path="/tokens" element={<TokenUsagePage />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                <AdminPage />
              </RequireRole>
            }
          />
        </Routes>
      </Layout>
    </EnvironmentProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </AuthProvider>
  );
}
