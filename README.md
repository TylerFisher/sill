# Sill

**Top news from the people you trust**

Sill collects links posted by the people you follow on [Bluesky](https://bsky.social) and [Mastodon](https://joinmastodon.org), and aggregates them into a list of the most popular links in your network.

You can find the official production version of Sill at [sill.social](https://sill.social)

## Architecture

Sill is a monorepo built with [pnpm workspaces](https://pnpm.io/workspaces) and [Turborepo](https://turbo.build/repo). It uses [React Router](https://reactrouter.com) for the web app, [Hono](https://hono.dev) for the API, and [Postgres](https://www.postgresql.org) for the database.

### Apps

- **`apps/web/`** - React Router v7 web application (port 3000)
- **`apps/api/`** - Hono API server (port 3001)
- **`apps/worker/`** - Background job processor for social media data

### Packages

- **`@sill/schema`** - Shared database schema and types (Drizzle ORM)
- **`@sill/auth`** - Authentication utilities and OAuth
- **`@sill/links`** - Link processing and social media integration
- **`@sill/emails`** - Email templates (React Email) and Mailgun service

## Prerequisites

- Node.js >= 22
- pnpm >= 10.17.1
- Docker

You'll also need a [Mailgun](https://mailgun.com) account for transactional emails.

## Development Setup

### Local Development (Recommended)

Run the database in Docker and everything else locally with hot-reload:

1. Create your environment file and generate secrets:
```bash
cp .env.example .env
pnpm generate-secrets
```

2. Start the database:
```bash
docker-compose up -d
```

3. Install dependencies and start all packages:
```bash
pnpm install
pnpm dev:local
```

4. Visit `http://localhost:3000` (web) and `http://localhost:3001` (API).

### Docker Development

Run everything in containers (matches production environment):

```bash
pnpm dev:docker
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev:local` | Start all packages in development mode |
| `pnpm dev:docker` | Start everything in Docker containers |
| `pnpm build` | Build all packages for production |
| `pnpm lint` | Run Biome linter/formatter |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm test` | Run Vitest tests |

## Database

Sill uses [Drizzle ORM](https://orm.drizzle.team) with Postgres:

- Schema: `packages/schema/src/schema.ts`
- Migrations: `packages/schema/src/migrations/`
- Config: `drizzle.config.ts`