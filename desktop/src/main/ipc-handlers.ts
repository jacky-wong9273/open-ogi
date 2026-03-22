import type { IpcMain } from "electron";
import {
  getClientDatabase,
  AgentRepository,
  ConfigRepository,
  AuditRepository,
  ConversationRepository,
  ToolInvocationRepository,
  CredentialStore,
  LocalConfig,
} from "@open-ogi/client";

export function registerIpcHandlers(ipcMain: IpcMain): void {
  const db = getClientDatabase();
  const agentRepo = new AgentRepository(db);
  const configRepo = new ConfigRepository(db);
  const auditRepo = new AuditRepository(db);
  const conversationRepo = new ConversationRepository(db);
  const toolInvocationRepo = new ToolInvocationRepository(db);
  const credentials = new CredentialStore();
  const localConfig = new LocalConfig(configRepo);

  // --- Agent handlers ---
  ipcMain.handle("agents:list", async () => {
    return agentRepo.list();
  });

  ipcMain.handle("agents:get", async (_e, id: string) => {
    return agentRepo.getById(id);
  });

  ipcMain.handle("agents:create", async (_e, data: Record<string, unknown>) => {
    return agentRepo.create(data as any);
  });

  ipcMain.handle(
    "agents:update",
    async (_e, id: string, data: Record<string, unknown>) => {
      return agentRepo.update(id, data as any);
    },
  );

  ipcMain.handle("agents:delete", async (_e, id: string) => {
    return agentRepo.delete(id);
  });

  // --- Config handlers ---
  ipcMain.handle("config:get", async (_e, key: string) => {
    return configRepo.get(key);
  });

  ipcMain.handle("config:set", async (_e, key: string, value: string) => {
    configRepo.set(key, value);
  });

  ipcMain.handle("config:get-all", async () => {
    return configRepo.getAll();
  });

  // --- Credential handlers ---
  ipcMain.handle(
    "credentials:set-api-key",
    async (_e, provider: string, apiKey: string) => {
      await credentials.setApiKey(provider, apiKey);
    },
  );

  ipcMain.handle("credentials:get-api-key", async (_e, provider: string) => {
    return credentials.getApiKey(provider);
  });

  ipcMain.handle("credentials:list-providers", async () => {
    return credentials.listProviders();
  });

  ipcMain.handle("credentials:delete-api-key", async (_e, provider: string) => {
    await credentials.deleteApiKey(provider);
  });

  // --- Monitor handlers ---
  ipcMain.handle("monitor:audit-log", async (_e, limit?: number) => {
    return auditRepo.list(limit);
  });

  ipcMain.handle(
    "monitor:conversations",
    async (_e, agentId: string, limit?: number) => {
      return conversationRepo.getHistory(agentId, limit);
    },
  );

  ipcMain.handle(
    "monitor:tool-invocations",
    async (_e, agentId: string, limit?: number) => {
      return toolInvocationRepo.listByAgent(agentId, limit);
    },
  );
}
