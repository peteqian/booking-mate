# Booking Mate - Agent Instructions

## Project Overview

A Turborepo monorepo with a React frontend (web) and Hono/Bun backend (server), sharing TypeScript contracts.

## Workspace Structure

```
booking-mate/
├── apps/
│   ├── web/          # React + Vite frontend
│   └── server/       # Hono + Bun API server
├── packages/
│   └── contracts/    # Shared TypeScript interfaces
├── scripts/
│   └── setup.ts      # One-time project setup
├── docker-compose.yml
├── .env
└── turbo.json
```

## Tech Stack

- **Package Manager**: Bun
- **Monorepo**: Turborepo
- **Frontend**: React 19, Vite, Tailwind CSS, Base UI
- **Backend**: Hono, Bun runtime
- **Database**: PostgreSQL (Docker), Drizzle ORM
- **Linting**: Oxlint
- **Formatting**: Oxfmt

## Environment

Copy `.env.example` to `.env` and configure:

```bash
# Database
POSTGRES_USER=booking_mate
POSTGRES_PASSWORD=booking_mate_password
POSTGRES_DB=booking_mate
DATABASE_URL=postgresql://booking_mate:booking_mate_password@localhost:5433/booking_mate

# Application Ports
SERVER_PORT=3456
WEB_PORT=5678
```

## Common Commands

```bash
# Initial setup (starts db, installs deps, runs migrations)
bun run setup

# Start development (runs web + server)
bun run dev

# Database
bun run db:up       # Start Postgres container
bun run db:down     # Stop Postgres container
bun run db:logs     # View database logs

# Code quality
bun run lint        # Run oxlint
bun run lint:fix    # Fix lint issues
bun run format      # Format with oxfmt
bun run format:check # Check formatting
bun run typecheck   # TypeScript check
bun run build       # Production build
```

## Database

### Server-specific commands

```bash
cd apps/server
bun run db:generate   # Generate Drizzle migrations
bun run db:migrate    # Apply migrations
bun run db:studio     # Open Drizzle Studio
```

### Schema

Database schema lives in `apps/server/src/db/schema.ts`. After modifying:

1. Run `bun run db:generate` to create migration
2. Run `bun run db:migrate` to apply it

## Ports

- **Web**: http://localhost:5678
- **Server**: http://localhost:3456
- **Database**: localhost:5433 (mapped from container's 5432)

## Conventions

- Use `workspace:*` for internal package dependencies
- Server reads env from root `.env` via `--env-file=../../.env`
- Shared types go in `packages/contracts/src/index.ts`
- Run `bun run lint` and `bun run format:check` before committing

## Git

- Default branch: `main`
- Author: Peter Qian <peter.qian.dev@gmail.com>
- Remote: https://github.com/peteqian/booking-mate
