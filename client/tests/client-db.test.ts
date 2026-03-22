import { describe, it, expect, afterEach } from "vitest";
import {
  initClientDatabase,
  getClientDatabase,
  closeClientDatabase,
} from "../src/db/client-db.js";

describe("ClientDatabase", () => {
  afterEach(() => {
    closeClientDatabase();
  });

  it("initClientDatabase creates the database and all tables", () => {
    const db = initClientDatabase(":memory:");
    expect(db).toBeDefined();

    // Verify all expected tables exist
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )
      .all() as Array<{ name: string }>;
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain("agents");
    expect(tableNames).toContain("skills");
    expect(tableNames).toContain("tools");
    expect(tableNames).toContain("config");
    expect(tableNames).toContain("audit_log");
    expect(tableNames).toContain("conversations");
    expect(tableNames).toContain("tool_invocations");
    expect(tableNames).toContain("agent_references");
    expect(tableNames).toContain("token_usage");
    expect(tableNames).toContain("_migrations");
  });

  it("getClientDatabase returns the same instance after init", () => {
    const db1 = initClientDatabase(":memory:");
    const db2 = getClientDatabase();
    expect(db2).toBe(db1);
  });

  it("getClientDatabase throws if not initialized", () => {
    // closeClientDatabase is called in afterEach, but we have not called init yet
    expect(() => getClientDatabase()).toThrow(
      "Client database not initialized",
    );
  });

  it("closeClientDatabase cleans up", () => {
    initClientDatabase(":memory:");
    closeClientDatabase();

    // After closing, getClientDatabase should throw
    expect(() => getClientDatabase()).toThrow(
      "Client database not initialized",
    );
  });

  it("multiple calls to initClientDatabase with same path return the same instance", () => {
    const db1 = initClientDatabase(":memory:");
    const db2 = initClientDatabase(":memory:");
    expect(db2).toBe(db1);
  });

  it("migrations table records applied migrations", () => {
    const db = initClientDatabase(":memory:");
    const migrations = db
      .prepare("SELECT version, name FROM _migrations")
      .all() as Array<{ version: number; name: string }>;

    expect(migrations.length).toBeGreaterThanOrEqual(1);
    expect(migrations[0].version).toBe(1);
    expect(migrations[0].name).toBe("initial_schema");
  });

  it("foreign_keys pragma is enabled", () => {
    const db = initClientDatabase(":memory:");
    const result = db.pragma("foreign_keys") as Array<{ foreign_keys: number }>;
    expect(result[0].foreign_keys).toBe(1);
  });
});
