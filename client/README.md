# @open-ogi/client

The Agent Runtime — local execution engine for AI agents in the Open-OGI framework. Handles LLM interactions, workflow orchestration, subagent spawning, context management, audit logging, and messaging integrations.

## Architecture

```
src/
├── index.ts                    # Package entry — re-exports all modules
├── llm/
│   └── provider.ts             # LLM abstraction (OpenAI-compatible SDK)
├── runtime/
│   ├── agent-runtime.ts        # Core agent execution loop
│   ├── workflow-engine.ts      # Multi-step workflow orchestration
│   ├── context-manager.ts      # Shared context management
│   ├── subagent-spawner.ts     # Subagent lifecycle management
│   └── audit-logger.ts         # Append-only audit logging
├── sync/
│   └── server-sync.ts          # Server synchronization client
└── tools/
    ├── telegram.ts             # Telegram Bot messenger
    └── whatsapp.ts             # WhatsApp messenger
```

## Core Components

### AgentRuntime

The main execution engine that takes an abstract agent definition and runs it as a realized agent. Manages the agent lifecycle (idle → running → waiting → terminated), processes messages via LLM, and handles tool calls.

```typescript
import { AgentRuntime } from "@open-ogi/client";

const runtime = new AgentRuntime({
  serverUrl: "http://localhost:3100",
  wsUrl: "ws://localhost:3101",
  token: "jwt-token",
  clientId: "my-client",
  llm: {
    provider: "deepseek",
    model: "deepseek-chat",
    baseUrl: "https://api.deepseek.com",
    apiKey: "sk-...",
  },
});

await runtime.start(abstractAgentId);
```

### WorkflowEngine

Orchestrates multi-step workflows with sequential and parallel execution support. Each step can invoke an agent, skill, or tool with defined inputs/outputs.

```typescript
import { WorkflowEngine } from "@open-ogi/client";

const engine = new WorkflowEngine({
  runtime,
  maxConcurrency: 3,
});

await engine.execute(workflowDefinition);
```

### SubagentSpawner

Manages the lifecycle of temporary subagents. Enforces the maximum spawn depth (default: 2 levels) and handles parent-child communication.

```typescript
import { SubagentSpawner } from "@open-ogi/client";

const spawner = new SubagentSpawner(runtime, maxDepth);
const child = await spawner.spawn(agentDef, parentId, currentDepth);
```

### ContextManager

Provides shared context between collaborating agents. Permanent agents share context via context IDs; subagents inherit parent context.

### AuditLogger

Append-only audit logging for ISO 27001-2022 compliance. Every agent action, LLM call, and state change is recorded.

### LLMProvider

Abstraction over the OpenAI-compatible SDK. Supports any provider that implements the OpenAI chat completions API (DeepSeek, OpenAI, Anthropic via proxy, local models via Ollama, etc.).

```typescript
import { LLMProvider } from "@open-ogi/client";

const llm = new LLMProvider({
  provider: "deepseek",
  model: "deepseek-chat",
  baseUrl: "https://api.deepseek.com",
  apiKey: "sk-...",
});

const response = await llm.chat(messages, tools);
```

### ServerSync

HTTP + WebSocket client for synchronizing with the Labs Server. Fetches agent definitions, reports status updates, and streams real-time events.

### Messaging Tools

| Tool                | Description                                     |
| ------------------- | ----------------------------------------------- |
| `TelegramMessenger` | Send/receive messages via Telegram Bot API      |
| `WhatsAppMessenger` | Send/receive messages via WhatsApp Business API |

## Dependencies

| Package                       | Purpose                             |
| ----------------------------- | ----------------------------------- |
| `@open-ogi/shared`            | Shared types and utilities          |
| `openai` ^4.67                | OpenAI-compatible SDK for LLM calls |
| `ws` ^8.18                    | WebSocket client                    |
| `winston` ^3.14               | Structured logging                  |
| `zod` ^3.23                   | Runtime validation                  |
| `uuid` ^10.0                  | ID generation                       |
| `node-telegram-bot-api` ^0.66 | Telegram Bot API                    |

## Scripts

| Command              | Description                                  |
| -------------------- | -------------------------------------------- |
| `pnpm build`         | Compile TypeScript to `dist/`                |
| `pnpm dev`           | Development mode with hot reload (tsx watch) |
| `pnpm start`         | Production start                             |
| `pnpm test`          | Run tests with Vitest                        |
| `pnpm test:coverage` | Tests with coverage report                   |
| `pnpm clean`         | Remove build artifacts                       |

## Configuration

The client runtime is configured programmatically. Key settings:

| Option         | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `serverUrl`    | Labs Server HTTP URL (default: `http://localhost:3100`)    |
| `wsUrl`        | Labs Server WebSocket URL (default: `ws://localhost:3101`) |
| `token`        | JWT authentication token                                   |
| `clientId`     | Unique client identifier                                   |
| `llm.provider` | LLM provider name                                          |
| `llm.model`    | LLM model name                                             |
| `llm.baseUrl`  | LLM API base URL                                           |
| `llm.apiKey`   | LLM API key                                                |

## License

MIT
