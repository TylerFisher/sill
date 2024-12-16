# Sill

**Top news from the people you trust**

Sill collects links posted by the people you follow on [Bluesky](https://bsky.social) and [Mastodon](https://joinmastodon.org), and aggregates them into a list of the most popular links in your network.

You can find the official production version of Sill at [sill.social](https://sill.social)

## How it works

Sill is a [React Router](https://reactrouter.com) application with a [Postgres](https://www.postgresql.org) database. 

## Prerequisites

- Node.js >= 20
- Docker

Sill uses [Mailgun](https://mailgun.com) to send transactional emails. Sign up for an account and get your API key. For reasonable solo usage, it should be free.

## Getting started

1. Create your environment file:

```shellscript
cp .env.example .env
npm run generate-secrets
```

2. Run the Docker containers:

```shellscript
docker-compose up -d
```

3. Visit `localhost:3000` in your web browser.