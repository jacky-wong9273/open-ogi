import { describe, it, expect, beforeEach } from "vitest";
import { EnvironmentService } from "../src/services/environment.js";
import { initDatabase, closeDatabase } from "../src/db/index.js";
import type { AppDatabase } from "../src/db/index.js";

describe("EnvironmentService", () => {
  let db: AppDatabase;
  let service: EnvironmentService;

  beforeEach(() => {
    closeDatabase();
    db = initDatabase(":memory:");
    service = new EnvironmentService(db);
  });

  describe("create", () => {
    it("creates an environment and returns it with all fields", async () => {
      const env = await service.create({
        name: "development",
        description: "Development environment",
        type: "development",
        config: { llmProvider: "deepseek" },
        createdBy: "user-1",
        isActive: true,
      });

      expect(env.id).toBeTruthy();
      expect(env.name).toBe("development");
      expect(env.description).toBe("Development environment");
      expect(env.type).toBe("development");
      expect(env.config).toEqual({ llmProvider: "deepseek" });
      expect(env.createdBy).toBe("user-1");
      expect(env.isActive).toBe(true);
      expect(env.createdAt).toBeTruthy();
      expect(env.updatedAt).toBeTruthy();
    });

    it("creates an environment with minimal data using defaults", async () => {
      const env = await service.create({
        name: "minimal-env",
      });

      expect(env.id).toBeTruthy();
      expect(env.name).toBe("minimal-env");
      expect(env.description).toBe("");
      expect(env.type).toBe("development");
      expect(env.config).toEqual({});
      expect(env.createdBy).toBe("");
      expect(env.isActive).toBe(true);
    });

    it("creates multiple environments with unique ids", async () => {
      const e1 = await service.create({ name: "env-1" });
      const e2 = await service.create({ name: "env-2" });

      expect(e1.id).not.toBe(e2.id);
      expect(e1.name).toBe("env-1");
      expect(e2.name).toBe("env-2");
    });

    it("stores config as JSON and retrieves it correctly", async () => {
      const config = {
        llmProvider: "openai",
        llmModel: "gpt-4",
        maxTokens: 4096,
        nested: { key: "value" },
      };
      const env = await service.create({
        name: "config-test",
        config: config as Record<string, unknown>,
      });

      expect(env.config).toEqual(config);
    });
  });

  describe("getById", () => {
    it("returns the environment for an existing id", async () => {
      const created = await service.create({
        name: "lookup-env",
        description: "Lookup test",
      });

      const found = await service.getById(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe("lookup-env");
    });

    it("returns null for a non-existing id", async () => {
      const found = await service.getById("non-existent-id");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("returns all environments", async () => {
      await service.create({ name: "env-a" });
      await service.create({ name: "env-b" });
      await service.create({ name: "env-c" });

      const envs = await service.list();
      expect(envs).toHaveLength(3);
    });

    it("returns empty array when no environments exist", async () => {
      const envs = await service.list();
      expect(envs).toEqual([]);
    });

    it("returns environments with all their fields populated", async () => {
      await service.create({
        name: "full-env",
        description: "Full test",
        type: "production",
        config: { key: "val" },
        createdBy: "admin",
        isActive: true,
      });

      const envs = await service.list();
      expect(envs).toHaveLength(1);
      expect(envs[0].name).toBe("full-env");
      expect(envs[0].description).toBe("Full test");
      expect(envs[0].type).toBe("production");
      expect(envs[0].config).toEqual({ key: "val" });
      expect(envs[0].createdBy).toBe("admin");
      expect(envs[0].isActive).toBe(true);
    });
  });

  describe("update", () => {
    it("updates an environment name and description", async () => {
      const created = await service.create({
        name: "original",
        description: "Original desc",
      });

      const updated = await service.update(created.id, {
        name: "updated",
        description: "Updated desc",
      });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("updated");
      expect(updated!.description).toBe("Updated desc");
    });

    it("updates the environment type", async () => {
      const created = await service.create({
        name: "type-test",
        type: "development",
      });

      const updated = await service.update(created.id, {
        type: "production",
      });

      expect(updated!.type).toBe("production");
    });

    it("updates the config", async () => {
      const created = await service.create({
        name: "config-update",
        config: { old: "value" },
      });

      const updated = await service.update(created.id, {
        config: { new: "value", extra: true } as Record<string, unknown>,
      });

      expect(updated!.config).toEqual({ new: "value", extra: true });
    });

    it("updates isActive", async () => {
      const created = await service.create({
        name: "active-test",
        isActive: true,
      });

      const updated = await service.update(created.id, { isActive: false });
      expect(updated!.isActive).toBe(false);
    });

    it("returns null when updating a non-existing environment", async () => {
      const result = await service.update("non-existent-id", { name: "Nope" });
      expect(result).toBeNull();
    });

    it("returns the environment unchanged when no update fields are provided", async () => {
      const created = await service.create({ name: "no-change" });
      const updated = await service.update(created.id, {});

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe(created.name);
    });

    it("updates the updatedAt timestamp", async () => {
      const created = await service.create({ name: "timestamp-test" });
      const updated = await service.update(created.id, { name: "new-name" });

      expect(updated!.updatedAt).not.toBe(created.updatedAt);
    });
  });

  describe("delete", () => {
    it("deletes an existing environment and returns true", async () => {
      const created = await service.create({ name: "delete-me" });
      const deleted = await service.delete(created.id);

      expect(deleted).toBe(true);

      const found = await service.getById(created.id);
      expect(found).toBeNull();
    });

    it("returns false when deleting a non-existing environment", async () => {
      const deleted = await service.delete("non-existent-id");
      expect(deleted).toBe(false);
    });

    it("removes the environment from list results", async () => {
      const e1 = await service.create({ name: "keep" });
      const e2 = await service.create({ name: "remove" });

      await service.delete(e2.id);

      const envs = await service.list();
      expect(envs).toHaveLength(1);
      expect(envs[0].name).toBe("keep");
    });
  });
});
