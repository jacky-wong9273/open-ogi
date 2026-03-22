import { ConfigRepository } from "../db/repositories/config-repo.js";

export interface LocalConfigData {
  llmProvider: string;
  llmModel: string;
  llmBaseUrl: string;
  serverUrl: string | null;
  clientId: string;
  environment: string;
  autoConnect: boolean;
}

const DEFAULTS: LocalConfigData = {
  llmProvider: "deepseek",
  llmModel: "deepseek-chat",
  llmBaseUrl: "https://api.deepseek.com",
  serverUrl: null,
  clientId: crypto.randomUUID(),
  environment: "development",
  autoConnect: false,
};

/**
 * Typed configuration manager backed by the client SQLite config table.
 */
export class LocalConfig {
  private repo: ConfigRepository;

  constructor(repo?: ConfigRepository) {
    this.repo = repo ?? new ConfigRepository();
  }

  get llmProvider(): string {
    return this.repo.get("llm_provider") ?? DEFAULTS.llmProvider;
  }
  set llmProvider(value: string) {
    this.repo.set("llm_provider", value);
  }

  get llmModel(): string {
    return this.repo.get("llm_model") ?? DEFAULTS.llmModel;
  }
  set llmModel(value: string) {
    this.repo.set("llm_model", value);
  }

  get llmBaseUrl(): string {
    return this.repo.get("llm_base_url") ?? DEFAULTS.llmBaseUrl;
  }
  set llmBaseUrl(value: string) {
    this.repo.set("llm_base_url", value);
  }

  get serverUrl(): string | null {
    return this.repo.get("server_url") ?? DEFAULTS.serverUrl;
  }
  set serverUrl(value: string | null) {
    if (value === null) {
      this.repo.delete("server_url");
    } else {
      this.repo.set("server_url", value);
    }
  }

  get clientId(): string {
    let id = this.repo.get("client_id");
    if (!id) {
      id = DEFAULTS.clientId;
      this.repo.set("client_id", id);
    }
    return id;
  }

  get environment(): string {
    return this.repo.get("environment") ?? DEFAULTS.environment;
  }
  set environment(value: string) {
    this.repo.set("environment", value);
  }

  get autoConnect(): boolean {
    return this.repo.get("auto_connect") === "true";
  }
  set autoConnect(value: boolean) {
    this.repo.set("auto_connect", value.toString());
  }

  /** Get all configuration as a single object */
  getAll(): LocalConfigData {
    return {
      llmProvider: this.llmProvider,
      llmModel: this.llmModel,
      llmBaseUrl: this.llmBaseUrl,
      serverUrl: this.serverUrl,
      clientId: this.clientId,
      environment: this.environment,
      autoConnect: this.autoConnect,
    };
  }
}
