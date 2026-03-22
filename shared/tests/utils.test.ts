import { describe, it, expect } from "vitest";
import {
  generateId,
  now,
  calculateTokenCost,
  formatAuditEntry,
  createAuditLogHeader,
  validateSpawnDepth,
  sanitizeMarkdown,
} from "../src/utils.js";

describe("generateId", () => {
  it("returns a valid UUID string", () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe("now", () => {
  it("returns an ISO timestamp", () => {
    const ts = now();
    expect(() => new Date(ts).toISOString()).not.toThrow();
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe("calculateTokenCost", () => {
  it("calculates cost for deepseek-chat", () => {
    const cost = calculateTokenCost("deepseek-chat", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.27 + 1.1, 2);
  });

  it("returns 0 for unknown model", () => {
    expect(calculateTokenCost("unknown-model", 1000, 1000)).toBe(0);
  });

  it("scales linearly with token count", () => {
    const cost1 = calculateTokenCost("gpt-4o", 500_000, 0);
    const cost2 = calculateTokenCost("gpt-4o", 1_000_000, 0);
    expect(cost2).toBeCloseTo(cost1 * 2, 4);
  });

  it("handles zero tokens", () => {
    expect(calculateTokenCost("deepseek-chat", 0, 0)).toBe(0);
  });
});

describe("formatAuditEntry", () => {
  it("formats as markdown table row", () => {
    const entry = formatAuditEntry(
      "2024-01-01T00:00:00Z",
      "create",
      "agent-1",
      "Created agent",
    );
    expect(entry).toBe(
      "| 2024-01-01T00:00:00Z | create | agent-1 | Created agent |\n",
    );
  });
});

describe("createAuditLogHeader", () => {
  it("contains table header", () => {
    const header = createAuditLogHeader();
    expect(header).toContain("# Audit Log");
    expect(header).toContain("| Timestamp |");
    expect(header).toContain("|-----------|");
  });
});

describe("validateSpawnDepth", () => {
  it("returns true when depth is within limit", () => {
    expect(validateSpawnDepth(0, 2)).toBe(true);
    expect(validateSpawnDepth(1, 2)).toBe(true);
  });

  it("returns false when depth equals or exceeds limit", () => {
    expect(validateSpawnDepth(2, 2)).toBe(false);
    expect(validateSpawnDepth(3, 2)).toBe(false);
  });
});

describe("sanitizeMarkdown", () => {
  it("removes script tags", () => {
    const input = 'Hello <script>alert("xss")</script> world';
    expect(sanitizeMarkdown(input)).toBe("Hello  world");
  });

  it("removes inline event handlers", () => {
    const input = '<div onload="alert(1)">content</div>';
    expect(sanitizeMarkdown(input)).toBe("<div >content</div>");
  });

  it("preserves normal markdown", () => {
    const input = "# Hello\n\n**bold** and *italic*\n\n- list item";
    expect(sanitizeMarkdown(input)).toBe(input);
  });
});
