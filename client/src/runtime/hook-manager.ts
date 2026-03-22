import { generateId, now } from "@open-ogi/shared";
import type {
  HookEvent,
  HookHandler,
  HookContext,
  HookRegistration,
} from "@open-ogi/shared";

/**
 * Manages lifecycle hooks for agent operations.
 * Handlers are called in priority order (lower number = higher priority).
 * Errors in one handler do not prevent others from running.
 *
 * Inspired by openclaw's hook system.
 */
export class HookManager {
  private hooks: HookRegistration[] = [];

  /** Register a hook handler for one or more events */
  register(
    events: HookEvent | HookEvent[],
    handler: HookHandler,
    options: { priority?: number; source?: string } = {},
  ): string {
    const id = generateId();
    const eventList = Array.isArray(events) ? events : [events];

    this.hooks.push({
      id,
      events: eventList,
      handler,
      priority: options.priority ?? 100,
      source: options.source ?? "unknown",
    });

    // Keep sorted by priority
    this.hooks.sort((a, b) => a.priority - b.priority);

    return id;
  }

  /** Unregister a hook by ID */
  unregister(id: string): boolean {
    const idx = this.hooks.findIndex((h) => h.id === id);
    if (idx < 0) return false;
    this.hooks.splice(idx, 1);
    return true;
  }

  /** Emit an event, calling all matching handlers in priority order */
  async emit(
    event: HookEvent,
    ctx: HookContext,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    const matching = this.hooks.filter((h) => h.events.includes(event));

    for (const hook of matching) {
      try {
        await hook.handler(event, ctx, data);
      } catch {
        // Errors in hooks are isolated — one hook failure
        // does not prevent subsequent hooks from running.
      }
    }
  }

  /** Get all registered hook IDs for an event */
  getHandlers(event: HookEvent): HookRegistration[] {
    return this.hooks.filter((h) => h.events.includes(event));
  }

  /** Get total hook count */
  get size(): number {
    return this.hooks.length;
  }

  /** Clear all hooks */
  clear(): void {
    this.hooks = [];
  }
}
