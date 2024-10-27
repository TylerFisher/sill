# Sill

**Top news from the people you trust**

Sill collects links posted by the people you follow on [Bluesky](https://bsky.social) and [Mastodon](https://joinmastodon.org), and aggregates them into a list of the most popular links in your network.

You can find the official production version of Sill at [sill.social](https://sill.social)

## How it works

Sill is a [Remix](https://remix.run) application with a [Redis](https://redis.io) cache layer and a [Postgresql](https://www.postgresql.org) database. 

Currently, Sill is built to be deployed on [Vercel](https://vercel.com). To adapt to other infrastructure, you would need to install and setup the proper Remix adapter. See the [Remix docs](https://remix.run/docs/en/main/other-api/adapter) for more information.

In production, Sill connects to [Upstash](https://upstash.com) for serverless Redis and [Neon](https://neon.tech) for serverless Postgresql, though you could choose other providers, or provision both yourself.

## Prerequisites

- Node.js > 20
- Postgresql
- Redis
- [Resend](https://resend.com) account

## Getting started

1. Install requirements:

```shellscript
npm install
```

2. Create your environment file:

```shellscript
cp .env.example .env
npm run generate-secrets
```

3. Setup your prerequisites

### Resend

Sill uses [Resend](https://resend.com) to send transactional emails. Sign up for an account and get your API key. For reasonable solo usage, it should be free.

### Redis

To run Redis locally, follow these steps in a separate terminal session (on a Mac):

```shellscript
brew install redis-stack
redis-stack-server
```

If you take this approach, you can set `REDIS_URL` in your .env to `redis://localhost:6379`.

You could also use [Docker](https://redis.io/learn/operate/orchestration/docker).

### Postgresql

To run Postgresql locally, you can take a few approaches. 

- On a Mac, you can download [Postgres.app](https://postgresapp.com)
- On a Mac, you can also install via Homebrew: `brew install postgresql`.

You could also use [Docker](https://www.code4it.dev/blog/run-postgresql-with-docker/).

Fill out the rest of the .env file with your Postgres URL, Redis URL, and Resend API key.

4. Setup your database

Once you have Postgres available, create the sill database and run migrations:

```shellscript
createdb sill
npx drizzle-kit migrate
```

5. Run the dev server:

```shellscript
npm run dev
```
