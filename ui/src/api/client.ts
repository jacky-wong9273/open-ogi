const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("ogi_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || res.statusText);
  }
  return res.json();
}

// Auth
export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<{ token: string; userId: string; refreshToken: string }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ username, password }),
        },
      ),
    me: () =>
      request<{ id: string; username: string; email: string; role: string }>(
        "/auth/me",
      ),
    listUsers: () =>
      request<
        Array<{
          id: string;
          username: string;
          email: string;
          role: string;
          isActive: boolean;
          createdAt: string;
        }>
      >("/auth/users"),
    createUser: (data: {
      username: string;
      email: string;
      password: string;
      role: string;
    }) =>
      request("/auth/users", { method: "POST", body: JSON.stringify(data) }),
    updateUserRole: (userId: string, role: string) =>
      request(`/auth/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
  },

  agents: {
    list: (env?: string) =>
      request<unknown[]>(`/agents${env ? `?environment=${env}` : ""}`),
    get: (id: string) => request<unknown>(`/agents/${id}`),
    create: (data: unknown) =>
      request("/agents", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/agents/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/agents/${id}`, { method: "DELETE" }),
    getReferences: (id: string) =>
      request<unknown[]>(`/agents/${id}/references`),
    addReference: (
      id: string,
      data: { filename: string; content: string; contextId: string },
    ) =>
      request(`/agents/${id}/references`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getAudit: (id: string) =>
      fetch(`${API_BASE}/agents/${id}/audit`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("ogi_token")}`,
        },
      }).then((r) => r.text()),
  },

  skills: {
    list: (env?: string) =>
      request<unknown[]>(`/skills${env ? `?environment=${env}` : ""}`),
    get: (id: string) => request<unknown>(`/skills/${id}`),
    create: (data: unknown) =>
      request("/skills", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/skills/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/skills/${id}`, { method: "DELETE" }),
  },

  tools: {
    list: (env?: string) =>
      request<unknown[]>(`/tools${env ? `?environment=${env}` : ""}`),
    get: (id: string) => request<unknown>(`/tools/${id}`),
    create: (data: unknown) =>
      request("/tools", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/tools/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/tools/${id}`, { method: "DELETE" }),
  },

  realizedAgents: {
    list: (filters?: Record<string, string>) => {
      const params = new URLSearchParams(filters);
      return request<unknown[]>(`/realized-agents?${params}`);
    },
    get: (id: string) => request<unknown>(`/realized-agents/${id}`),
    instantiate: (data: unknown) =>
      request("/realized-agents", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: string) =>
      request(`/realized-agents/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    terminate: (id: string) =>
      request(`/realized-agents/${id}`, { method: "DELETE" }),
    getChildren: (id: string) =>
      request<unknown[]>(`/realized-agents/${id}/children`),
  },

  monitoring: {
    getTokenReport: (startDate?: string, endDate?: string) => {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      return request<unknown>(`/monitoring/tokens?${params}`);
    },
    getAgentTimeline: (
      agentId: string,
      startDate?: string,
      endDate?: string,
    ) => {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      return request<unknown[]>(
        `/monitoring/tokens/agent/${agentId}?${params}`,
      );
    },
    getAuditLog: (filters?: Record<string, string>) => {
      const params = new URLSearchParams(filters);
      return request<{ entries: unknown[]; total: number }>(
        `/monitoring/audit?${params}`,
      );
    },
  },

  admin: {
    getAllAgents: () => request<unknown[]>("/admin/agents"),
    getSystemPrompt: () => request<{ prompt: string }>("/admin/system-prompt"),
    updateSystemPrompt: (prompt: string) =>
      request("/admin/system-prompt", {
        method: "PUT",
        body: JSON.stringify({ prompt }),
      }),
    getFullAuditLog: (limit?: number, offset?: number) =>
      request<{ entries: unknown[]; total: number }>(
        `/admin/audit?limit=${limit ?? 500}&offset=${offset ?? 0}`,
      ),
  },
};
