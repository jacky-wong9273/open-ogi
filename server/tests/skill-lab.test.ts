import { describe, it, expect, beforeEach } from "vitest";
import { SkillLabService } from "../src/services/skill-lab.js";
import { initDatabase, closeDatabase } from "../src/db/index.js";
import type { AppDatabase } from "../src/db/index.js";

function makeSkillData(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Skill",
    description: "A test skill",
    skillMd: "# Skill Definition",
    environment: "development",
    isPublic: false,
    createdBy: "user-1",
    ...overrides,
  };
}

describe("SkillLabService", () => {
  let db: AppDatabase;
  let service: SkillLabService;

  beforeEach(() => {
    closeDatabase();
    db = initDatabase(":memory:");
    service = new SkillLabService(db);
  });

  describe("create", () => {
    it("creates a skill and returns it with all fields", async () => {
      const skill = await service.create(makeSkillData());

      expect(skill.id).toBeTruthy();
      expect(skill.name).toBe("Test Skill");
      expect(skill.description).toBe("A test skill");
      expect(skill.skillMd).toBe("# Skill Definition");
      expect(skill.environment).toBe("development");
      expect(skill.isPublic).toBe(false);
      expect(skill.createdBy).toBe("user-1");
      expect(skill.createdAt).toBeTruthy();
      expect(skill.updatedAt).toBeTruthy();
      expect(skill.references).toEqual([]);
    });

    it("creates multiple skills with unique ids", async () => {
      const s1 = await service.create(makeSkillData({ name: "Skill 1" }));
      const s2 = await service.create(makeSkillData({ name: "Skill 2" }));

      expect(s1.id).not.toBe(s2.id);
      expect(s1.name).toBe("Skill 1");
      expect(s2.name).toBe("Skill 2");
    });
  });

  describe("getById", () => {
    it("returns the skill for an existing id", async () => {
      const created = await service.create(makeSkillData());
      const found = await service.getById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe("Test Skill");
    });

    it("returns null for a non-existing id", async () => {
      const found = await service.getById("non-existent-id");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("returns all skills when no filters are provided", async () => {
      await service.create(makeSkillData({ name: "Skill A" }));
      await service.create(makeSkillData({ name: "Skill B" }));

      const skills = await service.list();
      expect(skills).toHaveLength(2);
    });

    it("filters by environment", async () => {
      await service.create(
        makeSkillData({ name: "Dev Skill", environment: "development" }),
      );
      await service.create(
        makeSkillData({ name: "Prod Skill", environment: "production" }),
      );

      const devSkills = await service.list({ environment: "development" });
      expect(devSkills).toHaveLength(1);
      expect(devSkills[0].name).toBe("Dev Skill");

      const prodSkills = await service.list({ environment: "production" });
      expect(prodSkills).toHaveLength(1);
      expect(prodSkills[0].name).toBe("Prod Skill");
    });

    it("filters by createdBy and includes public skills", async () => {
      await service.create(
        makeSkillData({
          name: "Private A",
          createdBy: "user-1",
          isPublic: false,
        }),
      );
      await service.create(
        makeSkillData({
          name: "Private B",
          createdBy: "user-2",
          isPublic: false,
        }),
      );
      await service.create(
        makeSkillData({
          name: "Public C",
          createdBy: "user-2",
          isPublic: true,
        }),
      );

      const result = await service.list({ createdBy: "user-1" });
      const names = result.map((s) => s.name);
      expect(names).toContain("Private A");
      expect(names).toContain("Public C");
      expect(names).not.toContain("Private B");
    });

    it("filters by isPublic", async () => {
      await service.create(makeSkillData({ name: "Private", isPublic: false }));
      await service.create(makeSkillData({ name: "Public", isPublic: true }));

      const publicSkills = await service.list({ isPublic: true });
      expect(publicSkills).toHaveLength(1);
      expect(publicSkills[0].name).toBe("Public");
    });

    it("returns skills ordered by updatedAt descending", async () => {
      const s1 = await service.create(makeSkillData({ name: "First" }));
      await service.create(makeSkillData({ name: "Second" }));

      await service.update(s1.id, { name: "First Updated" });

      const skills = await service.list();
      expect(skills[0].name).toBe("First Updated");
      expect(skills[1].name).toBe("Second");
    });

    it("returns empty array when no skills match", async () => {
      const skills = await service.list({ environment: "staging" });
      expect(skills).toEqual([]);
    });
  });

  describe("update", () => {
    it("updates a skill name and description", async () => {
      const created = await service.create(makeSkillData());
      const updated = await service.update(created.id, {
        name: "Updated Skill",
        description: "Updated description",
      });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("Updated Skill");
      expect(updated!.description).toBe("Updated description");
      expect(updated!.skillMd).toBe("# Skill Definition");
    });

    it("updates skillMd", async () => {
      const created = await service.create(makeSkillData());
      const updated = await service.update(created.id, {
        skillMd: "# Updated Skill MD",
      });

      expect(updated!.skillMd).toBe("# Updated Skill MD");
    });

    it("returns null when updating a non-existing skill", async () => {
      const result = await service.update("non-existent-id", { name: "Nope" });
      expect(result).toBeNull();
    });

    it("returns the skill unchanged when no update fields are provided", async () => {
      const created = await service.create(makeSkillData());
      const updated = await service.update(created.id, {});

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe(created.name);
    });

    it("updates the updatedAt timestamp", async () => {
      const created = await service.create(makeSkillData());
      const updated = await service.update(created.id, { name: "New Name" });

      expect(updated!.updatedAt).not.toBe(created.updatedAt);
    });
  });

  describe("delete", () => {
    it("deletes an existing skill and returns true", async () => {
      const created = await service.create(makeSkillData());
      const deleted = await service.delete(created.id);

      expect(deleted).toBe(true);

      const found = await service.getById(created.id);
      expect(found).toBeNull();
    });

    it("returns false when deleting a non-existing skill", async () => {
      const deleted = await service.delete("non-existent-id");
      expect(deleted).toBe(false);
    });

    it("removes the skill from list results", async () => {
      const s1 = await service.create(makeSkillData({ name: "Keep" }));
      const s2 = await service.create(makeSkillData({ name: "Delete" }));

      await service.delete(s2.id);

      const skills = await service.list();
      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe("Keep");
    });
  });

  describe("count verification", () => {
    it("creates multiple skills and verifies the count", async () => {
      const count = 5;
      for (let i = 0; i < count; i++) {
        await service.create(makeSkillData({ name: `Skill ${i}` }));
      }

      const skills = await service.list();
      expect(skills).toHaveLength(count);
    });
  });

  describe("references", () => {
    it("adds a reference to a skill", async () => {
      const skill = await service.create(makeSkillData());
      const ref = await service.addReference(skill.id, "readme.md", "# README");

      expect(ref.id).toBeTruthy();
      expect(ref.filename).toBe("readme.md");
      expect(ref.content).toBe("# README");
    });

    it("retrieves references for a skill", async () => {
      const skill = await service.create(makeSkillData());
      await service.addReference(skill.id, "file1.md", "content1");
      await service.addReference(skill.id, "file2.md", "content2");

      const refs = await service.getReferences(skill.id);
      expect(refs).toHaveLength(2);
    });

    it("includes references when getting skill by id", async () => {
      const skill = await service.create(makeSkillData());
      await service.addReference(skill.id, "ref.md", "ref content");

      const fetched = await service.getById(skill.id);
      expect(fetched!.references).toHaveLength(1);
      expect(fetched!.references[0].filename).toBe("ref.md");
    });
  });
});
