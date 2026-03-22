import { describe, it, expect, beforeEach } from "vitest";
import { ToolLabService } from "../src/services/tool-lab.js";
import { initDatabase, closeDatabase } from "../src/db/index.js";
import type { AppDatabase } from "../src/db/index.js";

function makeToolData(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Tool",
    description: "A test tool",
    toolMd: "# Tool Definition",
    environment: "development",
    isPublic: false,
    createdBy: "user-1",
    ...overrides,
  };
}

describe("ToolLabService", () => {
  let db: AppDatabase;
  let service: ToolLabService;

  beforeEach(() => {
    closeDatabase();
    db = initDatabase(":memory:");
    service = new ToolLabService(db);
  });

  describe("create", () => {
    it("creates a tool and returns it with all fields", async () => {
      const tool = await service.create(makeToolData());

      expect(tool.id).toBeTruthy();
      expect(tool.name).toBe("Test Tool");
      expect(tool.description).toBe("A test tool");
      expect(tool.toolMd).toBe("# Tool Definition");
      expect(tool.environment).toBe("development");
      expect(tool.isPublic).toBe(false);
      expect(tool.createdBy).toBe("user-1");
      expect(tool.createdAt).toBeTruthy();
      expect(tool.updatedAt).toBeTruthy();
      expect(tool.scripts).toEqual([]);
      expect(tool.templates).toEqual([]);
      expect(tool.assets).toEqual([]);
    });

    it("creates multiple tools with unique ids", async () => {
      const t1 = await service.create(makeToolData({ name: "Tool 1" }));
      const t2 = await service.create(makeToolData({ name: "Tool 2" }));

      expect(t1.id).not.toBe(t2.id);
      expect(t1.name).toBe("Tool 1");
      expect(t2.name).toBe("Tool 2");
    });
  });

  describe("getById", () => {
    it("returns the tool for an existing id", async () => {
      const created = await service.create(makeToolData());
      const found = await service.getById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe("Test Tool");
    });

    it("returns null for a non-existing id", async () => {
      const found = await service.getById("non-existent-id");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("returns all tools when no filters are provided", async () => {
      await service.create(makeToolData({ name: "Tool A" }));
      await service.create(makeToolData({ name: "Tool B" }));

      const tools = await service.list();
      expect(tools).toHaveLength(2);
    });

    it("filters by environment", async () => {
      await service.create(
        makeToolData({ name: "Dev Tool", environment: "development" }),
      );
      await service.create(
        makeToolData({ name: "Prod Tool", environment: "production" }),
      );

      const devTools = await service.list({ environment: "development" });
      expect(devTools).toHaveLength(1);
      expect(devTools[0].name).toBe("Dev Tool");

      const prodTools = await service.list({ environment: "production" });
      expect(prodTools).toHaveLength(1);
      expect(prodTools[0].name).toBe("Prod Tool");
    });

    it("filters by createdBy and includes public tools", async () => {
      await service.create(
        makeToolData({
          name: "Private A",
          createdBy: "user-1",
          isPublic: false,
        }),
      );
      await service.create(
        makeToolData({
          name: "Private B",
          createdBy: "user-2",
          isPublic: false,
        }),
      );
      await service.create(
        makeToolData({ name: "Public C", createdBy: "user-2", isPublic: true }),
      );

      const result = await service.list({ createdBy: "user-1" });
      const names = result.map((t) => t.name);
      expect(names).toContain("Private A");
      expect(names).toContain("Public C");
      expect(names).not.toContain("Private B");
    });

    it("filters by isPublic", async () => {
      await service.create(makeToolData({ name: "Private", isPublic: false }));
      await service.create(makeToolData({ name: "Public", isPublic: true }));

      const publicTools = await service.list({ isPublic: true });
      expect(publicTools).toHaveLength(1);
      expect(publicTools[0].name).toBe("Public");
    });

    it("returns tools ordered by updatedAt descending", async () => {
      const t1 = await service.create(makeToolData({ name: "First" }));
      await service.create(makeToolData({ name: "Second" }));

      await service.update(t1.id, { name: "First Updated" });

      const tools = await service.list();
      expect(tools[0].name).toBe("First Updated");
      expect(tools[1].name).toBe("Second");
    });

    it("returns empty array when no tools match", async () => {
      const tools = await service.list({ environment: "staging" });
      expect(tools).toEqual([]);
    });
  });

  describe("update", () => {
    it("updates a tool name and description", async () => {
      const created = await service.create(makeToolData());
      const updated = await service.update(created.id, {
        name: "Updated Tool",
        description: "Updated description",
      });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("Updated Tool");
      expect(updated!.description).toBe("Updated description");
      expect(updated!.toolMd).toBe("# Tool Definition");
    });

    it("updates toolMd", async () => {
      const created = await service.create(makeToolData());
      const updated = await service.update(created.id, {
        toolMd: "# Updated Tool MD",
      });

      expect(updated!.toolMd).toBe("# Updated Tool MD");
    });

    it("returns null when updating a non-existing tool", async () => {
      const result = await service.update("non-existent-id", { name: "Nope" });
      expect(result).toBeNull();
    });

    it("returns the tool unchanged when no update fields are provided", async () => {
      const created = await service.create(makeToolData());
      const updated = await service.update(created.id, {});

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe(created.name);
    });

    it("updates the updatedAt timestamp", async () => {
      const created = await service.create(makeToolData());
      const updated = await service.update(created.id, { name: "New Name" });

      expect(updated!.updatedAt).not.toBe(created.updatedAt);
    });
  });

  describe("delete", () => {
    it("deletes an existing tool and returns true", async () => {
      const created = await service.create(makeToolData());
      const deleted = await service.delete(created.id);

      expect(deleted).toBe(true);

      const found = await service.getById(created.id);
      expect(found).toBeNull();
    });

    it("returns false when deleting a non-existing tool", async () => {
      const deleted = await service.delete("non-existent-id");
      expect(deleted).toBe(false);
    });

    it("removes the tool from list results", async () => {
      await service.create(makeToolData({ name: "Keep" }));
      const t2 = await service.create(makeToolData({ name: "Delete" }));

      await service.delete(t2.id);

      const tools = await service.list();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe("Keep");
    });
  });

  describe("count verification", () => {
    it("creates multiple tools and verifies the count", async () => {
      const count = 5;
      for (let i = 0; i < count; i++) {
        await service.create(makeToolData({ name: `Tool ${i}` }));
      }

      const tools = await service.list();
      expect(tools).toHaveLength(count);
    });
  });

  describe("scripts", () => {
    it("adds a script to a tool", async () => {
      const tool = await service.create(makeToolData());
      const script = await service.addScript(
        tool.id,
        "main.ts",
        "console.log('hello')",
        "typescript",
      );

      expect(script.id).toBeTruthy();
      expect(script.filename).toBe("main.ts");
      expect(script.content).toBe("console.log('hello')");
      expect(script.language).toBe("typescript");
    });

    it("retrieves scripts for a tool", async () => {
      const tool = await service.create(makeToolData());
      await service.addScript(tool.id, "main.ts", "code1", "typescript");
      await service.addScript(tool.id, "helper.py", "code2", "python");

      const scripts = await service.getScripts(tool.id);
      expect(scripts).toHaveLength(2);
    });

    it("includes scripts when getting tool by id", async () => {
      const tool = await service.create(makeToolData());
      await service.addScript(tool.id, "index.ts", "export {}", "typescript");

      const fetched = await service.getById(tool.id);
      expect(fetched!.scripts).toHaveLength(1);
      expect(fetched!.scripts[0].filename).toBe("index.ts");
      expect(fetched!.scripts[0].language).toBe("typescript");
    });
  });

  describe("templates", () => {
    it("adds a template to a tool", async () => {
      const tool = await service.create(makeToolData());
      const template = await service.addTemplate(
        tool.id,
        "prompt.md",
        "# Prompt Template",
      );

      expect(template.id).toBeTruthy();
      expect(template.filename).toBe("prompt.md");
      expect(template.content).toBe("# Prompt Template");
    });

    it("retrieves templates for a tool", async () => {
      const tool = await service.create(makeToolData());
      await service.addTemplate(tool.id, "template1.md", "content1");
      await service.addTemplate(tool.id, "template2.md", "content2");

      const templates = await service.getTemplates(tool.id);
      expect(templates).toHaveLength(2);
    });

    it("includes templates when getting tool by id", async () => {
      const tool = await service.create(makeToolData());
      await service.addTemplate(tool.id, "tpl.md", "template content");

      const fetched = await service.getById(tool.id);
      expect(fetched!.templates).toHaveLength(1);
      expect(fetched!.templates[0].filename).toBe("tpl.md");
    });
  });
});
