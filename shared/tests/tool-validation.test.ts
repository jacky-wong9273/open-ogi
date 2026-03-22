import { describe, it, expect } from "vitest";
import {
  readStringParam,
  readNumberParam,
  readBooleanParam,
  readArrayParam,
  ToolInputError,
  ToolAuthorizationError,
} from "@open-ogi/shared";

describe("Tool Validation", () => {
  describe("readStringParam", () => {
    it("reads a string parameter", () => {
      expect(readStringParam({ name: "hello" }, "name")).toBe("hello");
    });

    it("trims by default", () => {
      expect(readStringParam({ name: "  hello  " }, "name")).toBe("hello");
    });

    it("returns undefined for missing optional param", () => {
      expect(readStringParam({}, "name")).toBeUndefined();
    });

    it("throws for missing required param", () => {
      expect(() =>
        readStringParam({}, "name", { required: true }),
      ).toThrow(ToolInputError);
    });

    it("throws for non-string value", () => {
      expect(() =>
        readStringParam({ name: 123 }, "name", { required: true }),
      ).toThrow("must be a string");
    });

    it("rejects empty string when required", () => {
      expect(() =>
        readStringParam({ name: "" }, "name", { required: true }),
      ).toThrow("must not be empty");
    });

    it("enforces maxLength", () => {
      expect(() =>
        readStringParam({ name: "abcde" }, "name", { maxLength: 3 }),
      ).toThrow("exceeds maximum length");
    });
  });

  describe("readNumberParam", () => {
    it("reads a number parameter", () => {
      expect(readNumberParam({ count: 42 }, "count")).toBe(42);
    });

    it("coerces string to number", () => {
      expect(readNumberParam({ count: "42" }, "count")).toBe(42);
    });

    it("returns undefined for missing optional param", () => {
      expect(readNumberParam({}, "count")).toBeUndefined();
    });

    it("throws for missing required param", () => {
      expect(() =>
        readNumberParam({}, "count", { required: true }),
      ).toThrow(ToolInputError);
    });

    it("enforces min", () => {
      expect(() =>
        readNumberParam({ count: 0 }, "count", { min: 1 }),
      ).toThrow("must be >= 1");
    });

    it("enforces max", () => {
      expect(() =>
        readNumberParam({ count: 100 }, "count", { max: 50 }),
      ).toThrow("must be <= 50");
    });

    it("enforces integer", () => {
      expect(() =>
        readNumberParam({ count: 3.7 }, "count", { integer: true }),
      ).toThrow("must be an integer");
    });
  });

  describe("readBooleanParam", () => {
    it("reads a boolean parameter", () => {
      expect(readBooleanParam({ flag: true }, "flag")).toBe(true);
    });

    it("coerces string 'true'", () => {
      expect(readBooleanParam({ flag: "true" }, "flag")).toBe(true);
    });

    it("coerces string 'false'", () => {
      expect(readBooleanParam({ flag: "false" }, "flag")).toBe(false);
    });

    it("returns default value when missing", () => {
      expect(
        readBooleanParam({}, "flag", { defaultValue: true }),
      ).toBe(true);
    });

    it("throws for required missing", () => {
      expect(() =>
        readBooleanParam({}, "flag", { required: true }),
      ).toThrow(ToolInputError);
    });
  });

  describe("readArrayParam", () => {
    it("reads an array parameter", () => {
      expect(readArrayParam({ items: [1, 2, 3] }, "items")).toEqual([1, 2, 3]);
    });

    it("returns undefined for missing optional param", () => {
      expect(readArrayParam({}, "items")).toBeUndefined();
    });

    it("throws for non-array value", () => {
      expect(() =>
        readArrayParam({ items: "not-array" }, "items", { required: true }),
      ).toThrow("must be an array");
    });

    it("enforces maxItems", () => {
      expect(() =>
        readArrayParam({ items: [1, 2, 3] }, "items", { maxItems: 2 }),
      ).toThrow("exceeds maximum");
    });
  });

  describe("ToolAuthorizationError", () => {
    it("has status 403", () => {
      const err = new ToolAuthorizationError("forbidden");
      expect(err.status).toBe(403);
      expect(err.name).toBe("ToolAuthorizationError");
    });

    it("extends ToolInputError", () => {
      const err = new ToolAuthorizationError("forbidden");
      expect(err).toBeInstanceOf(ToolInputError);
    });
  });
});
