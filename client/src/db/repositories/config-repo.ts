import { getClientDatabase } from "../client-db.js";

export class ConfigRepository {
  get(key: string): string | null {
    const db = getClientDatabase();
    const row = db
      .prepare("SELECT value FROM config WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  set(key: string, value: string): void {
    const db = getClientDatabase();
    db.prepare(
      `
      INSERT INTO config (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `,
    ).run(key, value);
  }

  delete(key: string): boolean {
    const db = getClientDatabase();
    const result = db.prepare("DELETE FROM config WHERE key = ?").run(key);
    return result.changes > 0;
  }

  getAll(): Record<string, string> {
    const db = getClientDatabase();
    const rows = db.prepare("SELECT key, value FROM config").all() as Array<{
      key: string;
      value: string;
    }>;
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }
}
