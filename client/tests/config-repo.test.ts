import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  initClientDatabase,
  closeClientDatabase,
} from "../src/db/client-db.js";
import { ConfigRepository } from "../src/db/repositories/config-repo.js";

describe("ConfigRepository", () => {
  let repo: ConfigRepository;

  beforeEach(() => {
    initClientDatabase(":memory:");
    repo = new ConfigRepository();
  });

  afterEach(() => {
    closeClientDatabase();
  });

  it("sets and gets a key-value pair", () => {
    repo.set("theme", "dark");
    const value = repo.get("theme");
    expect(value).toBe("dark");
  });

  it("get returns null for a missing key", () => {
    const value = repo.get("nonexistent");
    expect(value).toBeNull();
  });

  it("set overwrites existing values (UPSERT)", () => {
    repo.set("language", "en");
    expect(repo.get("language")).toBe("en");

    repo.set("language", "fr");
    expect(repo.get("language")).toBe("fr");
  });

  it("getAll returns all entries", () => {
    repo.set("key1", "value1");
    repo.set("key2", "value2");
    repo.set("key3", "value3");

    const all = repo.getAll();
    expect(all).toEqual({
      key1: "value1",
      key2: "value2",
      key3: "value3",
    });
  });

  it("getAll returns empty object when no entries exist", () => {
    const all = repo.getAll();
    expect(all).toEqual({});
  });

  it("delete removes a key-value pair", () => {
    repo.set("temp", "data");
    expect(repo.get("temp")).toBe("data");

    const deleted = repo.delete("temp");
    expect(deleted).toBe(true);
    expect(repo.get("temp")).toBeNull();
  });

  it("delete returns false for a missing key", () => {
    const deleted = repo.delete("nonexistent");
    expect(deleted).toBe(false);
  });

  it("handles storing JSON strings as values", () => {
    const jsonValue = JSON.stringify({ nested: true, count: 42 });
    repo.set("settings", jsonValue);

    const retrieved = repo.get("settings");
    expect(retrieved).toBe(jsonValue);
    expect(JSON.parse(retrieved!)).toEqual({ nested: true, count: 42 });
  });

  it("set followed by getAll reflects the latest value", () => {
    repo.set("a", "1");
    repo.set("b", "2");
    repo.set("a", "overwritten");

    const all = repo.getAll();
    expect(all).toEqual({ a: "overwritten", b: "2" });
  });
});
