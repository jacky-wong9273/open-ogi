import { describe, it, expect } from "vitest";
import {
  MAX_SUBAGENT_DEPTH,
  DEFAULT_LLM_PROVIDER,
  DEFAULT_LLM_MODEL,
  TOKEN_COST_PER_MILLION,
  AGENT_FILES,
  SKILL_FILES,
  TOOL_FILES,
} from "../src/constants.js";

describe("constants", () => {
  it("MAX_SUBAGENT_DEPTH is 2", () => {
    expect(MAX_SUBAGENT_DEPTH).toBe(2);
  });

  it("DEFAULT_LLM_PROVIDER is deepseek", () => {
    expect(DEFAULT_LLM_PROVIDER).toBe("deepseek");
  });

  it("DEFAULT_LLM_MODEL is deepseek-chat", () => {
    expect(DEFAULT_LLM_MODEL).toBe("deepseek-chat");
  });

  it("TOKEN_COST_PER_MILLION has deepseek-chat", () => {
    expect(TOKEN_COST_PER_MILLION["deepseek-chat"]).toEqual({
      input: 0.27,
      output: 1.1,
    });
  });

  it("TOKEN_COST_PER_MILLION has expected models", () => {
    const models = Object.keys(TOKEN_COST_PER_MILLION);
    expect(models).toContain("deepseek-chat");
    expect(models).toContain("gpt-4o");
    expect(models).toContain("gpt-4o-mini");
  });

  it("AGENT_FILES has required keys", () => {
    expect(AGENT_FILES.AGENT_MD).toBe("AGENT.md");
    expect(AGENT_FILES.INSTRUCTIONS_MD).toBe("INSTRUCTIONS.md");
    expect(AGENT_FILES.SKILLS_MD).toBe("SKILLS.md");
    expect(AGENT_FILES.TOOLS_MD).toBe("TOOLS.md");
    expect(AGENT_FILES.STYLE_MD).toBe("STYLE.md");
  });

  it("SKILL_FILES has required keys", () => {
    expect(SKILL_FILES.SKILL_MD).toBe("SKILL.md");
  });

  it("TOOL_FILES has required keys", () => {
    expect(TOOL_FILES.TOOL_MD).toBe("TOOL.md");
    expect(TOOL_FILES.SCRIPTS).toBe("scripts/");
  });
});
