import { generateId } from "@open-ogi/shared";
import type {
  ToolRegistration,
  ToolFactory,
  RegisteredTool,
  ToolProfile,
  ToolContext,
  TOOL_PROFILE_HIERARCHY,
} from "@open-ogi/shared";

/**
 * Factory-based tool registry with lazy instantiation.
 * Tools are registered as factories and only instantiated when needed,
 * allowing context-aware initialization per session.
 *
 * Inspired by openclaw's PluginToolRegistry pattern.
 */
export class ToolRegistry {
  private registrations: ToolRegistration[] = [];
  private instantiated = new Map<string, RegisteredTool>();
  private activeProfile: ToolProfile = "full";

  /** Register a tool factory */
  register(
    name: string,
    factory: ToolFactory,
    options: {
      source?: string;
      optional?: boolean;
      profile?: ToolProfile;
    } = {},
  ): void {
    // Prevent duplicate registrations
    if (this.registrations.some((r) => r.name === name)) {
      throw new Error(`Tool "${name}" is already registered`);
    }

    this.registrations.push({
      name,
      factory,
      source: options.source ?? "built-in",
      optional: options.optional,
      profile: options.profile ?? "full",
    });
  }

  /** Register a pre-built tool directly (no factory needed) */
  registerTool(tool: RegisteredTool, source = "built-in"): void {
    this.register(
      tool.name,
      () => tool,
      { source, profile: tool.profile },
    );
  }

  /** Set the active tool profile (restricts available tools) */
  setProfile(profile: ToolProfile): void {
    this.activeProfile = profile;
    // Clear instantiated cache since profile changed
    this.instantiated.clear();
  }

  /** Get a tool by name, instantiating via factory if needed */
  get(name: string, ctx: ToolContext): RegisteredTool | undefined {
    // Check profile access
    const reg = this.registrations.find((r) => r.name === name);
    if (!reg) return undefined;

    if (!this.isProfileAllowed(reg.profile ?? "full")) {
      return undefined;
    }

    // Check cache
    const key = `${name}:${ctx.sessionKey}`;
    const cached = this.instantiated.get(key);
    if (cached) return cached;

    // Instantiate via factory
    try {
      const tool = reg.factory(ctx);
      this.instantiated.set(key, tool);
      return tool;
    } catch (err) {
      if (reg.optional) return undefined;
      throw err;
    }
  }

  /** List all available tool names for the current profile */
  listAvailable(): string[] {
    return this.registrations
      .filter((r) => this.isProfileAllowed(r.profile ?? "full"))
      .map((r) => r.name);
  }

  /** List all registered tool names (regardless of profile) */
  listAll(): string[] {
    return this.registrations.map((r) => r.name);
  }

  /** Check if a tool name is registered and allowed by profile */
  has(name: string): boolean {
    const reg = this.registrations.find((r) => r.name === name);
    return reg !== undefined && this.isProfileAllowed(reg.profile ?? "full");
  }

  /** Get the number of registered tools */
  get size(): number {
    return this.registrations.length;
  }

  /** Clear all cached instantiated tools */
  clearCache(): void {
    this.instantiated.clear();
  }

  /** Remove a specific tool registration */
  unregister(name: string): boolean {
    const idx = this.registrations.findIndex((r) => r.name === name);
    if (idx < 0) return false;
    this.registrations.splice(idx, 1);
    // Clear any cached instances
    for (const key of this.instantiated.keys()) {
      if (key.startsWith(`${name}:`)) {
        this.instantiated.delete(key);
      }
    }
    return true;
  }

  private isProfileAllowed(toolProfile: ToolProfile): boolean {
    const hierarchy: Record<ToolProfile, ToolProfile[]> = {
      minimal: ["minimal"],
      coding: ["minimal", "coding"],
      messaging: ["minimal", "messaging"],
      full: ["minimal", "coding", "messaging", "full"],
    };
    const allowed = hierarchy[this.activeProfile] ?? ["full"];
    return allowed.includes(toolProfile);
  }
}
