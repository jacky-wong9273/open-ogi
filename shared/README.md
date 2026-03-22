# @open-ogi/shared

Shared types, constants, and utilities for the Open-OGI framework. This package has **zero runtime dependencies** and is used by all other packages in the monorepo.

## Installation

```bash
pnpm install
pnpm --filter @open-ogi/shared build
```

## Exports

### Types

All TypeScript interfaces and type definitions used across the framework:

| Module        | Key Types                                                                                |
| ------------- | ---------------------------------------------------------------------------------------- |
| `agent`       | `AbstractAgent`, `RealizedAgent`, `AgentReference`, `AgentMessage`, `AgentStatus`        |
| `skill`       | `AbstractSkill`, `SkillReference`                                                        |
| `tool`        | `AbstractTool`, `ToolScript`, `ToolTemplate`                                             |
| `user`        | `User`, `AuthSession`, `LoginCredentials`, `UserRole`                                    |
| `token-usage` | `TokenUsageRecord`, `TokenUsageAggregate`, `TokenUsageReport`, `TokenUsageTimelinePoint` |
| `workflow`    | `Workflow`, `WorkflowStep`, `WorkflowExecution`                                          |
| `environment` | `Environment`                                                                            |

### Constants

| Constant                                   | Value             | Description                                                                  |
| ------------------------------------------ | ----------------- | ---------------------------------------------------------------------------- |
| `MAX_SUBAGENT_DEPTH`                       | `2`               | Maximum depth of subagent nesting                                            |
| `DEFAULT_LLM_PROVIDER`                     | `"deepseek"`      | Default LLM provider                                                         |
| `DEFAULT_LLM_MODEL`                        | `"deepseek-chat"` | Default LLM model                                                            |
| `SERVER_PORT`                              | `3100`            | Default server HTTP port                                                     |
| `WS_PORT`                                  | `3101`            | Default WebSocket port                                                       |
| `CLIENT_PORT`                              | `3200`            | Default client port                                                          |
| `UI_PORT`                                  | `3000`            | Default UI dev server port                                                   |
| `TOKEN_COST_PER_MILLION`                   | `{...}`           | Cost table per model (deepseek-chat, gpt-4o, claude-sonnet-4-20250514, etc.) |
| `AGENT_FILES`, `SKILL_FILES`, `TOOL_FILES` | `[...]`           | Expected file structure for lab resources                                    |

### Utilities

| Function                                               | Description                                 |
| ------------------------------------------------------ | ------------------------------------------- |
| `generateId()`                                         | Generate a UUID v4 identifier               |
| `now()`                                                | Current ISO 8601 timestamp                  |
| `calculateTokenCost(model, inputTokens, outputTokens)` | Calculate estimated cost from token counts  |
| `formatAuditEntry(entry)`                              | Format an audit log entry for display       |
| `createAuditLogHeader()`                               | Create the header for an audit log file     |
| `validateSpawnDepth(depth)`                            | Validate subagent depth does not exceed max |
| `sanitizeMarkdown(text)`                               | Sanitize markdown content                   |

## Usage

```typescript
import {
  type AbstractAgent,
  type User,
  generateId,
  calculateTokenCost,
  MAX_SUBAGENT_DEPTH,
} from "@open-ogi/shared";
```

## Scripts

| Command      | Description                   |
| ------------ | ----------------------------- |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm test`  | Run unit tests with Vitest    |
| `pnpm clean` | Remove build artifacts        |

## License

MIT
