import { contextBridge, ipcRenderer } from "electron";

const ogiApi = {
  // Agents
  agents: {
    list: () => ipcRenderer.invoke("agents:list"),
    get: (id: string) => ipcRenderer.invoke("agents:get", id),
    create: (data: Record<string, unknown>) =>
      ipcRenderer.invoke("agents:create", data),
    update: (id: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke("agents:update", id, data),
    delete: (id: string) => ipcRenderer.invoke("agents:delete", id),
  },
  // Config
  config: {
    get: (key: string) => ipcRenderer.invoke("config:get", key),
    set: (key: string, value: string) =>
      ipcRenderer.invoke("config:set", key, value),
    getAll: () => ipcRenderer.invoke("config:get-all"),
  },
  // Credentials
  credentials: {
    setApiKey: (provider: string, apiKey: string) =>
      ipcRenderer.invoke("credentials:set-api-key", provider, apiKey),
    getApiKey: (provider: string) =>
      ipcRenderer.invoke("credentials:get-api-key", provider),
    listProviders: () => ipcRenderer.invoke("credentials:list-providers"),
    deleteApiKey: (provider: string) =>
      ipcRenderer.invoke("credentials:delete-api-key", provider),
  },
  // Monitor
  monitor: {
    auditLog: (limit?: number) =>
      ipcRenderer.invoke("monitor:audit-log", limit),
    conversations: (agentId: string, limit?: number) =>
      ipcRenderer.invoke("monitor:conversations", agentId, limit),
    toolInvocations: (agentId: string, limit?: number) =>
      ipcRenderer.invoke("monitor:tool-invocations", agentId, limit),
  },
};

contextBridge.exposeInMainWorld("ogiApi", ogiApi);

export type OgiApi = typeof ogiApi;
