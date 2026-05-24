# Sill AppView API

A read-only HTTP API over an AT Protocol (Bluesky + other atproto networks) **URL-aggregation index**. The core question it answers is *personalised*: **"what URLs are the people I follow sharing?"** — plus search, author/domain lookup, and audience views. It is plain REST (no XRPC, no lexicons).

This document is for an agent building the Sill frontend that consumes this API.

---

## 1. Connecting

- **Base URL**: configured out of band (the AppView binds to a private network interface, not the public internet). Treat it as `${BASE_URL}` — e.g. `http://10.0.0.5:3000`.
- **Auth**: every `/v1/*` route requires an `X-API-Key` header. The key is issued per consumer and configured out of band.
- **Content type**: all responses are `application/json`.

```
GET ${BASE_URL}/v1/trending?viewer=did:plc:abc123&days=1
X-API-Key: <your-key>
```

`/healthz` and `/metrics` are open (no key) for liveness probes and Prometheus.

---

## 2. Core concepts

### Viewer & "my network"
Most endpoints take a `viewer` (a DID, e.g. `did:plc:...`). Results are scoped to **the accounts that viewer follows** (their network). The follow graph is expanded server-side, so the request stays small no matter how many people the viewer follows.

### Networks
atproto is multi-network. The `network` param selects which follow graph(s) define "my network". Default is `bsky`. Comma-separated. Valid keys:
`bsky`, `tangled`, `grain`, `sprk`, `cosmik`, `sifa`, `rocksky`, `skyreader`, `standard`.
Example: `?network=bsky,tangled`. Most consumers can ignore this and accept the `bsky` default.

### Time window
`days` (int, 1–90, default 1) bounds results to shares in the last N days.

### Cold start
A viewer whose follow graph hasn't been indexed yet is **cold**. Cold responses return `{ "items": [], "cold": true }`; the first time a viewer is seen the API registers them as a seed and enqueues their network for backfill in the background. **Frontend handling**: when `cold: true`, show an "indexing your network, check back shortly" state and retry the same request later (seconds-to-minutes). Don't treat it as an error or as "no results". To avoid the cold round-trip entirely, pre-register users at signup via [`POST /v1/seeds`](#post-v1seeds).

### Canonical URLs
Aggregating endpoints return **canonical** URLs: variants that point to the same thing are collapsed (e.g. `youtu.be/X` and `youtube.com/watch?v=X` become one row, tracking params stripped). The `url` you get back is the canonical form. When you call `/v1/hydration`, pass these canonical URLs back — it resolves raw variants for you.

### Pagination (cursor)
Paginated endpoints return an optional `cursor` string. To get the next page, pass it back verbatim as `?cursor=...`. **The cursor is opaque** — don't parse or construct it. **No `cursor` field in the response means you've reached the last page.**

### Filters / preferences (optional, all endpoints)
- `hideLabels` — CSV of moderation label values to hide (max 20). e.g. `?hideLabels=spam,nsfw`
- `hideUrls` — repeated param, exact URLs to exclude (max 25, each ≤2048 chars).
- `hideDids` — repeated param, DIDs to exclude (max 50).
- `collection` — repeated param, restrict to specific record types (NSIDs, max 10). e.g. `?collection=app.bsky.feed.post&collection=app.bsky.feed.repost`. Omit to include all.

**Param encoding**: CSV params (`network`, `hideLabels`) use commas. Repeated params (`collection`, `hideUrls`, `hideDids`, `urls`) repeat the key: `?hideDids=did:plc:a&hideDids=did:plc:b`. Keep the total URL under ~16 KB (the caps above are tuned for this).

### Datetime format
Timestamps (`mostRecent`, `eventTime`, `publishedAt`) are ClickHouse-formatted UTC strings: `"2026-05-20 13:00:00.000"` (space separator, **no `T`/`Z`**). To parse in JS, treat as UTC:
```ts
const d = new Date(ts.replace(" ", "T") + "Z");
```

---

## 3. Response envelopes

**Paginated endpoints** (`trending`, `latest`, `search`, `by-author`, `by-domain`):
```ts
{ items: Item[]; cursor?: string; cold?: true }
```

**Hydration**:
```ts
{ shares: ShareRow[] }
```

**Backfill status**: a flat object (see §5).

---

## 4. Data shapes

### UrlItem (returned by all aggregating endpoints)
```ts
interface UrlItem {
  url: string;          // canonical URL
  shares: number;       // distinct accounts in scope who shared it
  avatars: string[];    // up to 3 sharer avatar URLs, for a face-pile preview
  mostRecent: string;   // UTC datetime of the latest share
  giftUrl?: string;     // a gift/unlocked-article link, if a sharer used one (NYT/WaPo/etc.)
  // URL metadata — present only when the URL has been scraped; fields omitted when unknown:
  title?: string;
  description?: string;
  imageUrl?: string;    // preview/OG image URL
  siteName?: string;    // e.g. "The New York Times"
  byline?: string;      // article author(s)
  publishedAt?: string; // UTC datetime the article was published
}
```
`avatars` holds **up to** 3 bsky.app CDN avatar URLs for accounts who shared the URL — for an avatar-preview face pile. It can be shorter than `shares` (and occasionally empty) because sharers without a set avatar are skipped; arbitrary 3 of the sharers, not ranked. **Exception**: `/v1/latest` items use `eventTime` (UTC datetime) instead of `shares` + `mostRecent` and have **no** `avatars` (it isn't a share-count endpoint); everything else is identical.

> Metadata is scraped asynchronously. A freshly-seen URL may come back with only `url` (+ maybe `giftUrl`) and no `title`/`imageUrl` until the scraper catches up. Render a graceful fallback (show the bare URL/domain).

### ShareRow (returned by `/v1/hydration`)
Represents one individual share of a URL by one account — this is what you use to render "who in my network shared this, and what they said".
```ts
interface ShareRow {
  url: string;          // the canonical URL this share is for
  actorDid: string;     // who shared it
  collection: string;   // record type, e.g. "app.bsky.feed.post" or "app.bsky.feed.repost"
  rkey: string;         // record key
  atUri: string;        // at://<actorDid>/<collection>/<rkey>
  eventTime: string;    // UTC datetime of the share
  record: string;       // RAW atproto record, JSON-STRINGIFIED (see §6 — JSON.parse it)
  actorHandle?: string; // current handle, e.g. "nytimes.com"
  actorName?: string;   // display name, e.g. "The New York Times"
  actorAvatar?: string; // ready-to-use avatar image URL (already constructed); may be absent
  giftUrl?: string;     // this sharer's gift link, if any
  subject?: SubjectPost; // for reposts & quotes: the referenced post (see below)
}

// The post a repost/quote points at, resolved server-side. Present only when
// that post is indexed (in-network author); absent otherwise — fall back to
// rendering just the pointer.
interface SubjectPost {
  atUri: string;
  record: string;        // RAW atproto record of the referenced post, JSON-STRINGIFIED
  actorDid: string;
  actorHandle?: string;
  actorName?: string;
  actorAvatar?: string;
}
```

---

## 5. Endpoints

All paginated endpoints accept the shared params: `viewer`, `days`, `limit` (1–100, default 20), `cursor`, `collection`, `network`, `hideLabels`, `hideUrls`, `hideDids`.

### `GET /v1/trending`
Top URLs by number of distinct accounts in the viewer's network who shared them.
- **Required**: `viewer`.
- **Returns**: `{ items: UrlItem[]; cursor?; cold? }` sorted by `shares` desc, then recency.

```
GET /v1/trending?viewer=did:plc:abc&days=1&limit=25
```
```json
{
  "items": [
    {
      "url": "https://www.nytimes.com/2026/05/20/...",
      "shares": 42,
      "mostRecent": "2026-05-20 13:01:22.500",
      "title": "Headline here",
      "description": "Standfirst...",
      "imageUrl": "https://static01.nyt.com/....jpg",
      "siteName": "The New York Times",
      "byline": "Jane Smith",
      "publishedAt": "2026-05-20 11:00:00.000",
      "giftUrl": "https://www.nytimes.com/2026/05/20/...?unlocked_article_code=..."
    }
  ],
  "cursor": "eyJ..."
}
```

### `GET /v1/network-trending`
Top URLs across the **entire index** by distinct sharers — **not** scoped to any viewer's follow set. Powers a global/discovery trending page.
- **No `viewer`** (and no `network` param — network selection is about follow graphs, irrelevant here).
- `limit` defaults to **10** (the other endpoints default to 20). `days`, `collection`, and the hide-prefs (`hideLabels`/`hideUrls`/`hideDids`) all apply; hide-prefs are optional so a caller can layer on moderation.
- **Returns**: `{ items: UrlItem[]; cursor? }` (never `cold`), sorted by `shares` desc, then recency.
- Each item also carries **`topPost`** — the most-shared post containing that link (a hydrated post, same shape as a `/v1/hydration` share, plus `shares` = its reposts + quotes, i.e. "Most shared"). Omitted when no candidate post is found. Note `topPost.shares` (reposts + quotes of that one post) is distinct from the item-level `shares` (distinct accounts who shared the URL).
- Same result for every caller, so it's cached and shared server-side; expect it to be a few seconds stale at most.

```
GET /v1/network-trending?days=1&limit=10
```

### `GET /v1/latest`
Same as trending but ordered by recency (most recent share first). Items use `eventTime` instead of `shares`/`mostRecent`.
- **Required**: `viewer`.

### `GET /v1/search`
Keyword search over shared URLs. Matches whole tokens (case-insensitive, all tokens required) against post text, scraped title, and scraped description — or the query as a substring of the URL.
- **Required**: `q` (2–256 chars).
- **`viewer` is optional**: with it, search is scoped to the viewer's network; **without it, searches the whole index** (network-wide). `network` only applies when `viewer` is present.
- **Returns**: `UrlItem[]` sorted by shares desc.

```
GET /v1/search?viewer=did:plc:abc&q=climate%20policy&days=30
```

### `GET /v1/by-author`
URLs whose scraped article **byline** matches the given author (whole-token AND match, e.g. `Jane Smith` requires both tokens).
- **Required**: `author` (2–128 chars).
- **`viewer` optional** (same viewer/network-wide modes as search).

### `GET /v1/by-domain`
URLs from a specific hostname (leading `www.` stripped).
- **Required**: `domain` — a bare hostname like `nytimes.com` (no scheme/path).
- **`viewer` optional** (same modes as search).

### `GET /v1/hydration`
Given canonical URLs, return the **individual shares** of each by accounts in the viewer's network — the rows you render under a URL card ("shared by @a, @b, …").
- **Required**: `viewer`, `urls` (repeated param, 1–100 URLs).
- Accepts `days`, `collection`, `network`, and the hide-prefs — **pass the same values you used for the trending/latest call** so the share set matches what was counted.
- **Returns**: `{ shares: ShareRow[] }` sorted by share time desc. (No pagination/cursor.)

```
GET /v1/hydration?viewer=did:plc:abc&days=1&urls=https://www.nytimes.com/2026/05/20/...&urls=https://example.com/x
```
```json
{
  "shares": [
    {
      "url": "https://www.nytimes.com/2026/05/20/...",
      "actorDid": "did:plc:reporterxyz",
      "collection": "app.bsky.feed.post",
      "rkey": "3kabc...",
      "atUri": "at://did:plc:reporterxyz/app.bsky.feed.post/3kabc...",
      "eventTime": "2026-05-20 13:01:22.500",
      "record": "{\"$type\":\"app.bsky.feed.post\",\"text\":\"Worth a read:\",\"createdAt\":\"2026-05-20T13:01:22.500Z\",\"facets\":[...]}",
      "actorHandle": "reporter.bsky.social",
      "actorName": "A Reporter",
      "actorAvatar": "https://cdn.bsky.app/img/avatar/plain/did:plc:reporterxyz/bafkrei...@jpeg"
    }
  ]
}
```

### `POST /v1/seeds`
Register one or more viewer DIDs as **seeds** — the accounts whose follow graph we index. Call this at signup/login so a user's follows are tracked from the start, rather than waiting for their first feed request to auto-register them (which the cold-start probe also does).

- **Body** (JSON): `{ "dids": ["did:plc:…", …] }` — 1–1000 valid `did:` URIs.
- Registers each DID and enqueues a backfill of their existing follows. **Idempotent** — re-registering an already-known seed is a no-op (a previously-indexed non-seed is upgraded and re-walked).
- **Returns**: `{ "registered": number, "total": number }` — `registered` = newly-added DIDs, `total` = DIDs in the request.

```
POST /v1/seeds
Content-Type: application/json
X-API-Key: …

{ "dids": ["did:plc:abc", "did:plc:def"] }
```
```json
{ "registered": 1, "total": 2 }
```

### `GET /v1/backfill-status`
Global indexing progress (not per-viewer).
```ts
{ reposDone: number; reposTotal: number; failed: number; reposRatio: number; ready: boolean }
```
`reposRatio` is 0–1 overall progress. Useful for a global "still warming up" banner; it is **not** a precise signal that a specific viewer's network is ready — for that, just retry the viewer's endpoint and check `cold`.

### `GET /healthz` (open)
`{ "ok": true }` (200) or `{ "ok": false }` (503).

### `GET /metrics` (open)
Prometheus exposition format.

---

## 6. Rendering a shared post

`/v1/hydration` gives you everything to render a Bluesky-style post card per share:

- **Author identity**: `actorName` (display name), `actorHandle` (handle), `actorAvatar` (image URL — use directly in `<img src>`; it may be absent while a profile is still being indexed, so fall back to a placeholder). `actorDid` is the stable identifier.
- **Post permalink**: build from `atUri`. For a `app.bsky.feed.post`:
  ```ts
  // atUri = at://<did>/app.bsky.feed.post/<rkey>
  const url = `https://bsky.app/profile/${actorDid}/post/${rkey}`;
  ```
- **Post body**: `record` is the **raw atproto record as a JSON string** — `JSON.parse(record)` to get it. For `app.bsky.feed.post` it has `text`, `createdAt`, optional `facets` (rich-text links/mentions), `embed`, `langs`, `reply`. Render `text` (apply `facets` for links/mentions if you want rich text).

**Collection nuance** — check `collection`:
- `app.bsky.feed.post` — a normal post, or a **quote post**. `record.text` is the author's own words. If it's a quote, `subject` carries the quoted post (its `record`, author, avatar) — render the author's text with the quoted post embedded beneath.
- `app.bsky.feed.repost` — a repost. Here `record` is just the *repost* pointer (`{ subject: { uri, cid }, createdAt }`) with no text of its own; the **reposted post is in `subject`** (its `record` + author). Render "@actor reposted" above the `subject` post card.

**`subject` (reposts & quotes):** the AppView resolves the referenced post for you — `subject.record` is the full post (JSON.parse it the same as `record`), with `subject.actorDid`/`actorHandle`/`actorName`/`actorAvatar` for its author. It's **absent** only when that post isn't indexed (out-of-network author); in that case fall back to the bare pointer in `record.subject.uri` / the embed. Resolution is one level deep — a quoted post that itself quotes another isn't recursively expanded.

So a typical URL card shows: the URL's `title`/`imageUrl`/`siteName` (from the trending/latest item), then a row of the network members who shared it (from hydration: avatar + name + link to their post), and optionally a "read free" link if `giftUrl` is present.

---

## 7. Typical frontend flow

1. **List view** — `GET /v1/trending?viewer=<did>&days=1` → URL cards with metadata + share counts.
   - If `cold: true` → show "indexing your network…" and retry shortly.
2. **Who shared it** — take the `url`s you're displaying and `GET /v1/hydration?viewer=<did>&days=1&urls=<u1>&urls=<u2>…` (same `viewer`/`days`/`collection`/`network`/prefs as step 1) → render the sharer avatars/names/posts under each card.
3. **Pagination** — pass the trending `cursor` back as `?cursor=…` for the next page; stop when no `cursor` is returned.
4. **Search / filters** — `/v1/search`, `/v1/by-author`, `/v1/by-domain` for discovery; `hideDids`/`hideUrls`/`hideLabels` to honour user mutes/moderation.

---

## 8. Errors

JSON body `{ "error": string, "message": string }`:

| Status | `error`          | When |
|--------|------------------|------|
| 400    | `InvalidRequest` | Param validation failed; `message` names the offending field. |
| 401    | `Unauthorized`   | Missing/invalid `X-API-Key`. |
| 404    | `NotFound`       | Unknown route. |
| 500    | `InternalError`  | Server error (details are not leaked; check server logs). |
| 503    | (healthz only)   | Backend not healthy. |

**Empty results are not errors**: a 200 with `{ "items": [] }` (and possibly `cold: true`) is normal — handle it as "nothing to show yet" rather than failure.

---

## 9. Caching & performance notes

- Cacheable endpoints send `Cache-Control: public, max-age=N` (default 60s). You can cache responses client-side accordingly; there's no upstream cache.
- Warm queries are typically sub-100ms. During heavy backfill some queries are slower; the server allows up to 60s before aborting. Use sensible client timeouts and retries.
- Prefer one `/v1/hydration` call with many `urls` over many single-URL calls (it batches the lookup).

---

## 10. (Optional) Typed client

The AppView is built on Hono and exports an `AppType`. A TypeScript consumer *in the same monorepo* could use `hono/client`'s `hc<AppType>(BASE_URL)` for a typed client. Sill is a separate codebase, so plain `fetch` against the REST contract above is the expected integration path; the types in §4 mirror the server's response shapes.
