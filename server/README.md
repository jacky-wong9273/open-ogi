# @open-ogi/server

The Labs Server — centralized resource management and API backend for the Open-OGI framework. Manages agent definitions, skills, tools, user authentication, token tracking, and real-time communication via WebSocket.

## Architecture

```
src/
├── index.ts              # Entry point — Express + WS bootstrap
├── app.ts                # Express app factory (middleware, routes)
├── config.ts             # Environment variable schema (zod)
├── db/
│   └── index.ts          # Prisma client initialization
├── services/
│   ├── auth.ts           # Authentication (JWT + bcrypt)
│   ├── agent-lab.ts      # Abstract agent CRUD
│   ├── skill-lab.ts      # Abstract skill CRUD
│   ├── tool-lab.ts       # Abstract tool CRUD
│   ├── realized-agent.ts # Runtime agent instances
│   ├── token-tracker.ts  # Token usage recording & reporting
│   └── audit.ts          # Audit log service
├── routes/
│   ├── auth.ts           # POST /api/auth/login, /register, etc.
│   ├── agents.ts         # CRUD /api/agents
│   ├── skills.ts         # CRUD /api/skills
│   ├── tools.ts          # CRUD /api/tools
│   ├── realized-agents.ts# Runtime /api/realized-agents
│   └── monitoring.ts     # GET/POST /api/monitoring/*
├── middleware/
│   ├── auth.ts           # JWT authentication middleware
│   └── audit.ts          # Automatic audit logging for mutations
└── ws/
    └── gateway.ts        # WebSocket server for real-time updates
```

## Database

Uses **Prisma ORM** with **SQLite** as the default provider. The schema is defined in `prisma/schema.prisma`.

### Models

| Model            | Description                                       |
| ---------------- | ------------------------------------------------- |
| `User`           | System users with roles (admin, operator, viewer) |
| `Environment`    | Deployment environments                           |
| `AbstractAgent`  | Agent definitions (role, instructions, style)     |
| `AgentReference` | Links between agents for collaboration            |
| `AbstractSkill`  | Reusable organizational skills (SOPs, processes)  |
| `SkillReference` | Links between skills                              |
| `AbstractTool`   | Tool definitions with scripts and templates       |
| `ToolScript`     | Executable scripts attached to tools              |
| `ToolTemplate`   | Templates attached to tools                       |
| `RealizedAgent`  | Runtime agent instances                           |
| `TokenUsage`     | Token consumption records                         |
| `AuditLog`       | Append-only audit trail                           |
| `AgentMessage`   | Inter-agent messages                              |

### Database Commands

```bash
pnpm db:generate   # Generate Prisma client
pnpm db:push       # Push schema to database (dev)
pnpm db:migrate    # Run database migrations (prod)
pnpm db:studio     # Open Prisma Studio GUI
```

## Environment Variables

| Variable                  | Default                    | Description                                       |
| ------------------------- | -------------------------- | ------------------------------------------------- |
| `PORT`                    | `3100`                     | HTTP server port                                  |
| `WS_PORT`                 | `3101`                     | WebSocket gateway port                            |
| `JWT_SECRET`              | _(32-char placeholder)_    | JWT signing secret — **change in production**     |
| `JWT_EXPIRY`              | `"24h"`                    | JWT token expiry duration                         |
| `DATABASE_URL`            | `file:./data/open-ogi.db`  | Prisma database connection URL                    |
| `LOG_LEVEL`               | `"info"`                   | Winston log level (error, warn, info, debug)      |
| `CORS_ORIGIN`             | `http://localhost:3000`    | Allowed CORS origin                               |
| `ADMIN_USERNAME`          | `"admin"`                  | Default admin username (created on first run)     |
| `ADMIN_PASSWORD`          | `"admin1234"`              | Default admin password — **change in production** |
| `DEFAULT_LLM_PROVIDER`    | `"deepseek"`               | Default LLM provider name                         |
| `DEFAULT_LLM_MODEL`       | `"deepseek-chat"`          | Default LLM model name                            |
| `DEFAULT_LLM_BASE_URL`    | `https://api.deepseek.com` | LLM API base URL                                  |
| `DEFAULT_LLM_API_KEY`     | `""`                       | LLM API key                                       |
| `RATE_LIMIT_WINDOW_MS`    | `900000`                   | Rate limiting window (15 minutes)                 |
| `RATE_LIMIT_MAX_REQUESTS` | `100`                      | Max requests per window                           |

## API Endpoints

### Authentication

| Method  | Path                       | Description                  |
| ------- | -------------------------- | ---------------------------- |
| `POST`  | `/api/auth/login`          | Login with username/password |
| `POST`  | `/api/auth/register`       | Create a new user            |
| `GET`   | `/api/auth/me`             | Get current user profile     |
| `GET`   | `/api/auth/users`          | List all users (admin)       |
| `PATCH` | `/api/auth/users/:id/role` | Update user role (admin)     |

### Agent Lab

| Method   | Path              | Description           |
| -------- | ----------------- | --------------------- |
| `GET`    | `/api/agents`     | List abstract agents  |
| `GET`    | `/api/agents/:id` | Get agent by ID       |
| `POST`   | `/api/agents`     | Create abstract agent |
| `PUT`    | `/api/agents/:id` | Update abstract agent |
| `DELETE` | `/api/agents/:id` | Delete abstract agent |

### Skills Lab

| Method   | Path              | Description           |
| -------- | ----------------- | --------------------- |
| `GET`    | `/api/skills`     | List abstract skills  |
| `GET`    | `/api/skills/:id` | Get skill by ID       |
| `POST`   | `/api/skills`     | Create abstract skill |
| `PUT`    | `/api/skills/:id` | Update abstract skill |
| `DELETE` | `/api/skills/:id` | Delete abstract skill |

### Tools Lab

| Method   | Path             | Description          |
| -------- | ---------------- | -------------------- |
| `GET`    | `/api/tools`     | List abstract tools  |
| `GET`    | `/api/tools/:id` | Get tool by ID       |
| `POST`   | `/api/tools`     | Create abstract tool |
| `PUT`    | `/api/tools/:id` | Update abstract tool |
| `DELETE` | `/api/tools/:id` | Delete abstract tool |

### Realized Agents

| Method   | Path                                | Description             |
| -------- | ----------------------------------- | ----------------------- |
| `GET`    | `/api/realized-agents`              | List runtime agents     |
| `GET`    | `/api/realized-agents/:id`          | Get runtime agent by ID |
| `POST`   | `/api/realized-agents`              | Instantiate an agent    |
| `PATCH`  | `/api/realized-agents/:id/status`   | Update agent status     |
| `DELETE` | `/api/realized-agents/:id`          | Terminate an agent      |
| `GET`    | `/api/realized-agents/:id/children` | List child agents       |

### Monitoring

| Method | Path                               | Description              |
| ------ | ---------------------------------- | ------------------------ |
| `GET`  | `/api/monitoring/tokens`           | Token usage report       |
| `GET`  | `/api/monitoring/tokens/agent/:id` | Token timeline for agent |
| `POST` | `/api/monitoring/tokens`           | Record token usage       |
| `GET`  | `/api/monitoring/audit`            | Query audit log          |

### WebSocket Gateway (port 3101)

Connect with `ws://localhost:3101?token=JWT&clientId=ID`.

| Message Type          | Direction       | Description                  |
| --------------------- | --------------- | ---------------------------- |
| `subscribe_agent`     | Client → Server | Subscribe to agent updates   |
| `unsubscribe_agent`   | Client → Server | Unsubscribe from agent       |
| `agent_status_update` | Client → Server | Update agent status via WS   |
| `token_usage`         | Client → Server | Record token usage via WS    |
| `audit_entry`         | Client → Server | Log an audit entry via WS    |
| `list_agents`         | Client → Server | Request agents list          |
| `agent_update`        | Server → Client | Broadcast agent state change |
| `agents_list`         | Server → Client | Response to list_agents      |

## Security

- **JWT Authentication** on all routes (except login/register)
- **RBAC** with three roles: `admin`, `operator`, `viewer`
- **Helmet** for HTTP security headers
- **CORS** with configurable origin
- **Rate Limiting** on all routes
- **Audit Logging** for all state-changing HTTP methods

## Scripts

| Command              | Description                                    |
| -------------------- | ---------------------------------------------- |
| `pnpm build`         | Generate Prisma client + compile TypeScript    |
| `pnpm dev`           | Development server with hot reload (tsx watch) |
| `pnpm start`         | Production start                               |
| `pnpm test`          | Run tests with Vitest                          |
| `pnpm test:coverage` | Tests with coverage report                     |
| `pnpm clean`         | Remove build artifacts                         |

## License

MIT
