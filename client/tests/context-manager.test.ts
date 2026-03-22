import { describe, it, expect, beforeEach } from "vitest";
import { ContextManager } from "../src/runtime/context-manager.js";

describe("ContextManager", () => {
  let manager: ContextManager;

  beforeEach(() => {
    manager = new ContextManager();
  });

  describe("createContext", () => {
    it("creates a context and returns an ID", () => {
      const id = manager.createContext("Sprint 1", "First sprint context");
      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
    });

    it("creates distinct contexts", () => {
      const id1 = manager.createContext("A", "a");
      const id2 = manager.createContext("B", "b");
      expect(id1).not.toBe(id2);
    });
  });

  describe("getContext", () => {
    it("returns the created context", () => {
      const id = manager.createContext("Test", "Description");
      const ctx = manager.getContext(id);
      expect(ctx).toBeDefined();
      expect(ctx!.name).toBe("Test");
      expect(ctx!.description).toBe("Description");
    });

    it("returns undefined for unknown context", () => {
      expect(manager.getContext("nonexistent")).toBeUndefined();
    });
  });

  describe("references", () => {
    let contextId: string;

    beforeEach(() => {
      contextId = manager.createContext("Test", "Desc");
    });

    it("sets and gets a reference", () => {
      manager.setReference(contextId, "spec.md", "# Specification");
      expect(manager.getReference(contextId, "spec.md")).toBe(
        "# Specification",
      );
    });

    it("overwrites existing references", () => {
      manager.setReference(contextId, "spec.md", "v1");
      manager.setReference(contextId, "spec.md", "v2");
      expect(manager.getReference(contextId, "spec.md")).toBe("v2");
    });

    it("returns undefined for missing reference", () => {
      expect(manager.getReference(contextId, "missing.md")).toBeUndefined();
    });

    it("getReferences returns all references", () => {
      manager.setReference(contextId, "a.md", "A");
      manager.setReference(contextId, "b.md", "B");
      const refs = manager.getReferences(contextId);
      expect(refs.size).toBe(2);
    });

    it("throws when setting reference on nonexistent context", () => {
      expect(() => manager.setReference("bad-id", "f.md", "x")).toThrow();
    });
  });

  describe("participants", () => {
    it("adds participants", () => {
      const id = manager.createContext("T", "d");
      manager.addParticipant(id, "agent-1");
      manager.addParticipant(id, "agent-2");
      const ctx = manager.getContext(id)!;
      expect(ctx.participantAgentIds.size).toBe(2);
    });
  });

  describe("buildContextPrompt", () => {
    it("builds a prompt with name and description", () => {
      const id = manager.createContext("Review", "Code review context");
      const prompt = manager.buildContextPrompt(id);
      expect(prompt).toContain("## Working Context: Review");
      expect(prompt).toContain("Code review context");
    });

    it("includes references in prompt", () => {
      const id = manager.createContext("T", "d");
      manager.setReference(id, "spec.md", "The spec content");
      const prompt = manager.buildContextPrompt(id);
      expect(prompt).toContain("### References");
      expect(prompt).toContain("#### spec.md");
      expect(prompt).toContain("The spec content");
    });

    it("returns empty string for unknown context", () => {
      expect(manager.buildContextPrompt("bad-id")).toBe("");
    });
  });

  describe("listContexts", () => {
    it("lists all contexts", () => {
      manager.createContext("A", "a");
      manager.createContext("B", "b");
      expect(manager.listContexts()).toHaveLength(2);
    });

    it("returns empty array initially", () => {
      expect(manager.listContexts()).toHaveLength(0);
    });
  });
});
