# Sill

**Top news from the people you trust**

Sill collects links posted by the people you follow on [Bluesky](https://bsky.social) and [Mastodon](https://joinmastodon.org), and aggregates them into a list of the most popular links in your network.

You can find the official production version of Sill at [sill.social](https://sill.social)

## How it works

Sill is a [React Router](https://reactrouter.com) application with a [Postgres](https://www.postgresql.org) database. 

## Prerequisites

- Node.js >= 22
- pnpm >= 9.15.0
- Docker

Sill uses [Mailgun](https://mailgun.com) to send transactional emails. Sign up for an account and get your API key. For reasonable solo usage, it should be free.

## Development Setup

Sill is a monorepo with multiple packages. We support two development modes:

### Local Development (Recommended)

Run only the database in Docker, everything else locally with hot-reload:

1. Create your environment file:
```bash
cp .env.example .env
pnpm generate-secrets
```

2. Start the database:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

3. Install dependencies and start all packages:
```bash
pnpm install
pnpm dev:local
```

4. Visit `http://localhost:3000` in your browser.

This gives you:
- ✅ Fast hot-reloading across all packages
- ✅ Native Node.js debugging
- ✅ Instant TypeScript type updates
- ✅ Full pnpm workspace benefits

### Docker Development

Run everything in containers (slower but matches production):

```bash
pnpm dev:docker
```

## Architecture

The monorepo contains:

- **`packages/web/`** - React Router app (port 3000)
- **`packages/api/`** - Hono API server (port 3001)  
- **`packages/emails/`** - Shared email templates

### Key Features

- **Hot-reload types**: API type changes automatically update web package without rebuilding
- **Workspace linking**: Packages import from each other's TypeScript source
- **Turbo orchestration**: Parallel development and building across packages