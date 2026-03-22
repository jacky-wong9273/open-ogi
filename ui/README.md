# @open-ogi/ui

Web management dashboard for the Open-OGI framework. Built with React, Vite, and TanStack React Query. Provides a complete interface for managing agents, skills, tools, monitoring token usage, and reviewing audit logs.

## Architecture

```
src/
├── main.tsx           # App entry point
├── App.tsx            # Root component — router + query provider
├── api/
│   └── client.ts      # HTTP client (fetch wrapper with JWT)
├── components/
│   └── ...            # Reusable UI components (Layout, Sidebar, etc.)
├── hooks/
│   └── ...            # Custom React hooks (useAuth, useApi, etc.)
├── pages/
│   ├── Login.tsx       # Authentication page
│   ├── Dashboard.tsx   # Overview dashboard with key metrics
│   ├── AgentLab.tsx    # Create/edit/delete abstract agents
│   ├── SkillLab.tsx    # Create/edit/delete abstract skills
│   ├── ToolLab.tsx     # Create/edit/delete abstract tools
│   ├── AgentMonitor.tsx# Real-time agent status monitoring
│   ├── TokenUsage.tsx  # Token consumption charts & analytics
│   ├── AuditLog.tsx    # Searchable audit log viewer
│   └── AdminPanel.tsx  # User management (admin only)
└── styles/
    └── ...            # CSS / Tailwind styles
```

## Pages

| Page              | Path       | Description                                                            |
| ----------------- | ---------- | ---------------------------------------------------------------------- |
| **Login**         | `/login`   | Username/password authentication                                       |
| **Dashboard**     | `/`        | Overview metrics — active agents, token usage summary, recent activity |
| **Agent Lab**     | `/agents`  | CRUD interface for abstract agent definitions                          |
| **Skill Lab**     | `/skills`  | CRUD interface for abstract skill definitions                          |
| **Tool Lab**      | `/tools`   | CRUD interface for abstract tool definitions                           |
| **Agent Monitor** | `/monitor` | Real-time view of running agent instances and their statuses           |
| **Token Usage**   | `/tokens`  | Charts and analytics for token consumption (by agent, model, time)     |
| **Audit Log**     | `/audit`   | Searchable, filterable audit trail viewer                              |
| **Admin Panel**   | `/admin`   | User management — create users, assign roles, deactivate accounts      |

## Tech Stack

| Library              | Version | Purpose                                 |
| -------------------- | ------- | --------------------------------------- |
| React                | ^18.3   | UI framework                            |
| React Router DOM     | ^6.26   | Client-side routing                     |
| TanStack React Query | ^5.56   | Server state management & data fetching |
| Recharts             | ^2.12   | Token usage charts & visualizations     |
| Lucide React         | ^0.441  | Icon library                            |
| clsx                 | ^2.1    | Conditional classname utility           |
| Vite                 | ^5.4    | Build tool & dev server                 |

## Development

```bash
# Start development server (port 3000)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run tests
pnpm test
```

### Dev Server Proxy

The Vite dev server proxies `/api` requests to the Labs Server at `http://localhost:3100`. This means you need the server running for the UI to function during development.

```bash
# Terminal 1 — start the server
pnpm --filter @open-ogi/server dev

# Terminal 2 — start the UI
pnpm --filter @open-ogi/ui dev
```

## Build Output

Production build outputs to `dist/`. The built files are static HTML/JS/CSS and can be served by any static file server or bundled into a Docker image with nginx.

## Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `pnpm dev`           | Vite dev server on port 3000 with HMR    |
| `pnpm build`         | TypeScript check + Vite production build |
| `pnpm preview`       | Serve production build locally           |
| `pnpm test`          | Run tests with Vitest                    |
| `pnpm test:coverage` | Tests with coverage report               |
| `pnpm clean`         | Remove build artifacts                   |

## License

MIT
