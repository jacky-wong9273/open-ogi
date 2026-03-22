/**
 * IPC-based API client for the desktop renderer.
 * Instead of HTTP fetch (server UI), we use window.ogiApi which goes
 * through contextBridge -> ipcMain -> client runtime / SQLite.
 */
function getApi() {
  return window.ogiApi;
}

export const api = {
  agents: {
    list: () => getApi().agents.list(),
    get: (id: string) => getApi().agents.get(id),
    create: (data: Record<string, unknown>) => getApi().agents.create(data),
    update: (id: string, data: Record<string, unknown>) =>
      getApi().agents.update(id, data),
    delete: (id: string) => getApi().agents.delete(id),
  },
  config: {
    get: (key: string) => getApi().config.get(key),
    set: (key: string, value: string) => getApi().config.set(key, value),
    getAll: () => getApi().config.getAll(),
  },
  credentials: {
    setApiKey: (provider: string, apiKey: string) =>
      getApi().credentials.setApiKey(provider, apiKey),
    getApiKey: (provider: string) => getApi().credentials.getApiKey(provider),
    listProviders: () => getApi().credentials.listProviders(),
    deleteApiKey: (provider: string) =>
      getApi().credentials.deleteApiKey(provider),
  },
  monitor: {
    auditLog: (limit?: number) => getApi().monitor.auditLog(limit),
    conversations: (agentId: string, limit?: number) =>
      getApi().monitor.conversations(agentId, limit),
    toolInvocations: (agentId: string, limit?: number) =>
      getApi().monitor.toolInvocations(agentId, limit),
  },
};
