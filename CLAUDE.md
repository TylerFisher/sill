# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sill is a React Router (v7) application that aggregates popular links from Bluesky and Mastodon networks. The app uses a PostgreSQL database with Drizzle ORM and includes a background worker system for processing social media data.

## Essential Commands

### Development
- `docker-compose up -d` - Start development stack

### Code Quality
- `npm run lint` - Run Biome linter/formatter (uses tabs, not spaces)
- `npm run typecheck` - Run TypeScript checks and generate types
- `npm test` - Run Vitest tests

### Build & Deploy
- `npm run build` - Build production application
- `npm run build:worker` - Build worker for production
- `npm run start` - Start production server
- `npm run start:worker` - Start production worker

### Database
- Database migrations are in `app/drizzle/` directory
- Schema is defined in `app/drizzle/schema.server.ts`
- Use Drizzle Kit for database operations

## Architecture

### Core Structure
- **Routes**: Defined in `app/routes.ts` using React Router v7 route config
- **Database**: Drizzle ORM with PostgreSQL, schema in `app/drizzle/schema.server.ts`
- **Workers**: Background processing in `workers/process-queue.tsx` for social media data
- **Components**: Organized by feature (`forms/`, `linkPosts/`, `marketing/`, etc.)
- **Utils**: Server-side utilities in `app/utils/` (auth, email, social APIs)

### Key Features
- OAuth integration with Bluesky (`app/utils/bluesky.server.ts`) and Mastodon (`app/utils/mastodon.server.ts`)
- Email notifications using Mailgun (`app/utils/email.server.ts`)
- Link aggregation and ranking system (`app/utils/links.server.ts`)
- RSS feed generation for notifications and digests
- Queue-based background processing (`app/utils/queue.server.ts`)

### File Naming Conventions
- `*.server.ts` - Server-only code
- `*.module.css` - CSS modules
- Route files follow React Router v7 conventions

### Styling
- Uses Radix UI themes and components
- CSS modules for component-specific styles
- Global styles in `app/styles/`
- Custom Nacelle font family

## Environment Setup

1. Copy environment file and generate secrets:
   ```bash
   cp .env.example .env
   npm run generate-secrets
   ```

2. Start database: `docker-compose up -d`

3. Run development: `npm run dev`

## Testing

- Uses Vitest with happy-dom environment
- Test files should be co-located with source files
- Run tests with `npm test`