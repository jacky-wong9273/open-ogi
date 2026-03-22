const SERVICE_NAME = "open-ogi";

let keytarModule: typeof import("keytar") | null = null;

async function getKeytar(): Promise<typeof import("keytar")> {
  if (!keytarModule) {
    try {
      keytarModule = await import("keytar");
    } catch {
      throw new Error(
        "keytar is not available. Install it with native build tools to use the credential store.",
      );
    }
  }
  return keytarModule;
}

/**
 * Credential store using Windows Credential Manager via keytar.
 * API keys are stored securely in the OS credential manager,
 * inaccessible to processes without admin privileges.
 *
 * keytar is loaded lazily — the client can start without it installed.
 */
export class CredentialStore {
  /** Store an API key for a provider */
  async setApiKey(provider: string, apiKey: string): Promise<void> {
    const keytar = await getKeytar();
    await keytar.setPassword(SERVICE_NAME, `api-key:${provider}`, apiKey);
  }

  /** Retrieve an API key for a provider */
  async getApiKey(provider: string): Promise<string | null> {
    const keytar = await getKeytar();
    return keytar.getPassword(SERVICE_NAME, `api-key:${provider}`);
  }

  /** Delete an API key for a provider */
  async deleteApiKey(provider: string): Promise<boolean> {
    const keytar = await getKeytar();
    return keytar.deletePassword(SERVICE_NAME, `api-key:${provider}`);
  }

  /** List all stored provider names */
  async listProviders(): Promise<string[]> {
    const keytar = await getKeytar();
    const creds = await keytar.findCredentials(SERVICE_NAME);
    return creds
      .filter((c) => c.account.startsWith("api-key:"))
      .map((c) => c.account.replace("api-key:", ""));
  }

  /** Store a server auth token */
  async setServerToken(serverUrl: string, token: string): Promise<void> {
    const keytar = await getKeytar();
    await keytar.setPassword(SERVICE_NAME, `server-token:${serverUrl}`, token);
  }

  /** Retrieve a server auth token */
  async getServerToken(serverUrl: string): Promise<string | null> {
    const keytar = await getKeytar();
    return keytar.getPassword(SERVICE_NAME, `server-token:${serverUrl}`);
  }

  /** Delete a server auth token */
  async deleteServerToken(serverUrl: string): Promise<boolean> {
    const keytar = await getKeytar();
    return keytar.deletePassword(SERVICE_NAME, `server-token:${serverUrl}`);
  }
}
