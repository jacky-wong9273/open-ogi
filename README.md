# Open-OGI — Organizational General Intelligence Framework

Open-OGI is a shippable framework to orchestrate AI agents with organizational intelligence, driving real business impacts. It enables organizations to deploy AI agents in one-click with specific organizational knowledge, automating workflows with applied organizational culture.

## Architecture

```
open-ogi/
├── shared/          # @open-ogi/shared — Types, constants, utilities (zero deps)
├── server/          # @open-ogi/server — Labs Server (Express + Prisma + WebSocket)
├── client/          # @open-ogi/client — Agent Runtime (LLM, workflows, messaging)
├── ui/              # @open-ogi/ui — Web Dashboard (React + Vite)
├── labs/            # Default lab resources (agents, skills, tools)
├── k8s/             # Kubernetes manifests
├── docker-compose.yml
└── Dockerfile.*     # Container images
```

| Package                                | Description                                                       | Port                   |
| -------------------------------------- | ----------------------------------------------------------------- | ---------------------- |
| [`@open-ogi/shared`](shared/README.md) | Shared types, constants, and utility functions                    | —                      |
| [`@open-ogi/server`](server/README.md) | Labs Server — REST API, WebSocket gateway, Prisma/SQLite database | 3100 (HTTP), 3101 (WS) |
| [`@open-ogi/client`](client/README.md) | Agent Runtime — LLM execution, workflows, subagents, messaging    | 3200                   |
| [`@open-ogi/ui`](ui/README.md)         | Web Dashboard — agent management, monitoring, audit logs          | 3000                   |

## Core Concepts

### Labs (Server-Side)

- **Agent Lab**: Define abstract agents with roles, instructions, permitted skills/tools, and style
- **Skills Lab**: Reusable organizational skills — SOPs, processes, decision frameworks
- **Tools Lab**: Reusable tools — integrations, scripts, templates

### Agent Runtime (Client-Side)

- Instantiate agents from abstract definitions stored in the Labs Server
- **Permanent agents** collaborate via shared context IDs
- **Temporary subagents** (max 2 layers deep) handle task decomposition
- All actions are audit-logged (append-only) for ISO 27001-2022 compliance

### Agentic Workflow

- Permanent agents communicate through shared references
- Subagents report to parent agents only
- Context-based collaboration reduces token overhead
- Token usage is monitored per agent, skill, and tool

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 8 (recommended package manager)
- **Docker** + **Docker Compose** (optional, for containerized deployment)

## Quick Start

### 1. Install Dependencies

```bash
git clone <repo-url> open-ogi
cd open-ogi
pnpm install
```

### 2. Build the Shared Package

The shared package must be built first since all other packages depend on it:

```bash
pnpm --filter @open-ogi/shared build
```

### 3. Set Up the Database

The server uses Prisma with SQLite. Generate the Prisma client and create the database:

```bash
cd server
pnpm db:generate
pnpm db:push
cd ..
```

This creates an SQLite database at `server/data/open-ogi.db`.

### 4. Configure Environment (Optional)

Create a `.env` file in the `server/` directory. All values have sensible defaults for development:

```env
# Required for production — change these
JWT_SECRET=your-secret-key-at-least-32-characters
ADMIN_PASSWORD=your-admin-password

# LLM configuration
DEFAULT_LLM_PROVIDER=deepseek
DEFAULT_LLM_MODEL=deepseek-chat
DEFAULT_LLM_BASE_URL=https://api.deepseek.com
DEFAULT_LLM_API_KEY=sk-your-api-key

# Optional overrides
PORT=3100
WS_PORT=3101
DATABASE_URL=file:./data/open-ogi.db
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
```

See the [server README](server/README.md) for the full list of environment variables.

### 5. Start the Application

**Development (3 terminals):**

```bash
# Terminal 1 — Labs Server
pnpm --filter @open-ogi/server dev

# Terminal 2 — Agent Runtime
pnpm --filter @open-ogi/client dev

# Terminal 3 — Web UI
pnpm --filter @open-ogi/ui dev
```

**Docker Compose (single command):**

```bash
docker-compose up
```

### 6. Access the Dashboard

Open [http://localhost:3000](http://localhost:3000) and log in with:

- **Username:** `admin`
- **Password:** `admin1234` (or your `ADMIN_PASSWORD`)

## Dashboard Pages

| Page              | Description                                                    |
| ----------------- | -------------------------------------------------------------- |
| **Dashboard**     | Overview metrics — active agents, token usage, recent activity |
| **Agent Lab**     | Create and manage abstract agent definitions                   |
| **Skill Lab**     | Create and manage organizational skill definitions             |
| **Tool Lab**      | Create and manage tool definitions with scripts and templates  |
| **Agent Monitor** | Real-time monitoring of running agent instances                |
| **Token Usage**   | Charts and analytics for token consumption                     |
| **Audit Log**     | Searchable audit trail of all system operations                |
| **Admin Panel**   | User management — create users, assign roles                   |

## Tech Stack

| Layer         | Technology                                        |
| ------------- | ------------------------------------------------- |
| Language      | TypeScript (ESM)                                  |
| Server        | Express 4.21 + WebSocket (ws 8.18)                |
| Database      | Prisma ORM 6.4 + SQLite                           |
| UI            | React 18.3 + Vite 5.4                             |
| Data Fetching | TanStack React Query 5.56                         |
| Charts        | Recharts 2.12                                     |
| LLM           | OpenAI-compatible SDK 4.67 (default: DeepSeek v4) |
| Auth          | JWT (jsonwebtoken) + bcryptjs                     |
| Validation    | Zod 3.23                                          |
| Logging       | Winston 3.14                                      |
| Testing       | Vitest 2.1                                        |
| Deployment    | Docker + Kubernetes                               |

## Project Scripts

Run from the root of the monorepo:

| Command              | Description                                |
| -------------------- | ------------------------------------------ |
| `pnpm install`       | Install all dependencies across workspaces |
| `pnpm build`         | Build all packages                         |
| `pnpm dev`           | Start all packages in development mode     |
| `pnpm test`          | Run all tests                              |
| `pnpm test:coverage` | Run all tests with coverage reports        |
| `pnpm lint`          | Lint all packages                          |
| `pnpm clean`         | Remove all build artifacts                 |

## Security & Compliance

- **RBAC**: Three roles — `admin` (full access), `operator` (read + execute), `viewer` (read only)
- **JWT Authentication**: All API routes require a valid bearer token
- **Audit Logging**: Every state-changing operation is logged with user, timestamp, and details
- **Rate Limiting**: Configurable per-IP rate limiting on all endpoints
- **HTTP Security**: Helmet middleware for security headers
- **Agent Sandboxing**: Agents can only use explicitly permitted skills and tools
- **ISO 27001-2022**: Append-only audit trails, access controls, data protection

## Deployment

### Docker

```bash
docker-compose up -d
```

Services:

- `server` — Labs Server on ports 3100/3101
- `client` — Agent Runtime
- `ui` — Web Dashboard on port 3000 (nginx)

### Kubernetes

Manifests are provided in the `k8s/` directory for production deployments.

## License

MIT
