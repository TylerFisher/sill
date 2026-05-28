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
`days` (int, 1–90, default 1) bounds results to shares in the last N days. For **sub-day** windows use `hours` (int, 1–23) instead — e.g. `?hours=6` for the last 6 hours. When both are supplied, `hours` takes precedence. Omit both for the 1-day default (**except `/v1/network-trending`, which defaults to 3 hours** — see §5). Applies to every endpoint that takes `days`.

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
`avatars` holds **up to** 3 bsky.app CDN avatar URLs for accounts who shared the URL — for an avatar-preview face pile. It can be shorter than `shares` (and occasionally empty) because sharers without a set avatar are skipped; arbitrary 3 of the sharers, not ranked. **Exception**: `/v1/latest` items carry `eventTime` (UTC datetime of the most recent share) in place of `mostRecent`; they still include `shares` and `avatars`, counted over the same `days`/`hours` window. Everything else is identical.

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
  subject?: SubjectPost; // present when THIS subject is itself a quote/repost — the post it
                         // in turn references. Mainly: a repost OF a quote post, where
                         // `subject` is the quote post and `subject.subject` is the quoted
                         // post, so you can render the quoted content inside the reposted card.
}
```

---

## 5. Endpoints

All paginated endpoints accept the shared params: `viewer`, `days` (or `hours` for a sub-day window — see §2), `limit` (1–100, default 20), `cursor`, `collection`, `network`, `hideLabels`, `hideUrls`, `hideDids`.

### `GET /v1/trending`
Top URLs by number of distinct accounts in the viewer's network who shared them.
- **Required**: `viewer`.
- **Optional**: `minShares` (int, 1–1000, default 1) — drop URLs whose distinct-sharer count is below this. Use to surface only URLs that have caught on (e.g. `?minShares=3` for "shared by at least 3 people in my network"). Default 1 = no filter. Filtering is applied **before** ranking and pagination, so the cursor stays consistent across pages.
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
- `limit` defaults to **10** (the other endpoints default to 20). The time window defaults to **3 hours** here (other endpoints default to 1 day) — a fresher "what's hot right now" view; override with `days` or `hours`. `collection` and the hide-prefs (`hideLabels`/`hideUrls`/`hideDids`) all apply; hide-prefs are optional so a caller can layer on moderation.
- **Returns**: `{ items: UrlItem[]; cursor? }` (never `cold`), sorted by `shares` desc, then recency.
- Each item also carries **`topPost`** — the most-shared post containing that link (a hydrated post, same shape as a `/v1/hydration` share, plus `shares` = its reposts + quotes, i.e. "Most shared"). Omitted when no candidate post is found. Note `topPost.shares` (reposts + quotes of that one post) is distinct from the item-level `shares` (distinct accounts who shared the URL).
- Same result for every caller, so it's cached and shared server-side; expect it to be a few seconds stale at most.

```
GET /v1/network-trending?days=1&limit=10
```

### `GET /v1/latest`
Same shape as trending — including `shares` (distinct accounts in the network who shared the URL within the `days`/`hours` window) and the `avatars` face-pile — but ordered by recency (most recent share first) rather than share count. Items carry `eventTime` (the latest share time) in place of `mostRecent`.
- **Required**: `viewer`.
- **Optional**: `minShares` (int, 1–1000, default 1) — same semantics as on `/v1/trending`. Useful here to keep the recency feed from being dominated by URLs only one person has posted (e.g. `?minShares=2`). Default 1 = no filter.

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
- Matches on each URL's **canonical** domain, so shares posted via link shorteners / redirects (bit.ly, t.co, …) that resolve to this hostname are counted — share counts here line up with what the same URL shows in trending.

### `GET /v1/hydration`
Given canonical URLs, return the **individual shares** of each by accounts in the viewer's network — the rows you render under a URL card ("shared by @a, @b, …").
- **Required**: `viewer`, `urls` (repeated param, 1–100 URLs).
- Accepts `days` (or `hours`), `collection`, `network`, and the hide-prefs — **pass the same window and values you used for the trending/latest call** so the share set matches what was counted.
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

### `POST /v1/preferences`
Store a viewer's **muted words** and/or **muted accounts** (DIDs) server-side so they're applied to that viewer's feeds **before** ranking — i.e. trending share counts and ordering are computed over the already-muted set. This is the right home for them because the lists are open-ended (too large for query params), and post-rank client-side filtering would leave a correct ranking of the wrong set. Call this at login and whenever the user's Bluesky mutes change.

- **Body** (JSON): both fields are **optional**, and each one updates independently — send only what's changed, the other stays put. Each list is last-write-wins (replaces the whole list when present).
  - `mutedWords?: string[]` — from `app.bsky.actor.getPreferences`. Caps: ≤2000 entries, ≤128 chars each. Blanks dropped, entries deduped.
  - `mutedDids?: string[]` — from `app.bsky.graph.getMutes` (just the DIDs). Caps: ≤5000. Deduped.
  - At least one of the two must be present.
- **Muted-words matching.** A share is muted if a muted word appears in the **sharer's post text**, the **link URL** (so muting a domain like `nytimes.com` hides that domain's links), or the **linked article's title/description** — whole-word, case-insensitive — **or** if a muted word **exactly equals the sharer's handle** (an account mute by handle; leading `@` and case ignored, matched against the indexed handle snapshot so it's best-effort).
- **Muted-DIDs matching.** Shares by a muted DID are dropped at `effective_follows` — exact and instant, no snapshot. Covers direct shares AND repost/quote credit rows from the muted account. The reliable way to mute an account.
- **Where applied.** All viewer-scoped endpoints (`trending`, `latest`, viewer-mode `search`/`by-author`/`by-domain`, `hydration`). **Not** applied to `network-trending` or network-mode (no-`viewer`) requests — those are shared/global with no viewer to attribute mutes to.
- **You no longer send mute lists on read requests** — just `viewer`. (The small `hideUrls`/`hideDids`/`hideLabels` query params still work, and `hideDids` is fine for per-request transient exclusion alongside the persistent muted set.)
- **Freshness.** Uncached endpoints reflect a change immediately; `trending`'s first page is cached, so a change takes effect on the next revalidation (within ~a minute).
- **Returns**: `{ "ok": true, "mutedWords": number | null, "mutedDids": number | null }` — the count stored for each field, or `null` for a field you didn't include.

```
POST /v1/preferences
Content-Type: application/json
X-API-Key: …

{ "viewer": "did:plc:abc", "mutedWords": ["spoilers", "crypto"] }
```
```json
{ "ok": true, "mutedWords": 2, "mutedDids": null }
```

```
POST /v1/preferences
{ "viewer": "did:plc:abc", "mutedDids": ["did:plc:xyz", "did:plc:def"] }
```
```json
{ "ok": true, "mutedWords": null, "mutedDids": 2 }
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

**`subject` (reposts & quotes):** the AppView resolves the referenced post for you — `subject.record` is the full post (JSON.parse it the same as `record`), with `subject.actorDid`/`actorHandle`/`actorName`/`actorAvatar` for its author. It's **absent** only when that post isn't indexed (out-of-network author); in that case fall back to the bare pointer in `record.subject.uri` / the embed. Resolution goes up to **two levels**: a share's `subject`, plus that subject's own `subject` when the subject is itself a quote/repost — e.g. a **repost of a quote post** resolves both the quote post (`subject`) and the quoted post (`subject.subject`). It stops there; a third level isn't expanded.

So a typical URL card shows: the URL's `title`/`imageUrl`/`siteName` (from the trending/latest item), then a row of the network members who shared it (from hydration: avatar + name + link to their post), and optionally a "read free" link if `giftUrl` is present.

---

## 7. Typical frontend flow

1. **List view** — `GET /v1/trending?viewer=<did>&days=1` → URL cards with metadata + share counts.
   - If `cold: true` → show "indexing your network…" and retry shortly.
2. **Who shared it** — take the `url`s you're displaying and `GET /v1/hydration?viewer=<did>&days=1&urls=<u1>&urls=<u2>…` (same `viewer`, time window — `days` or `hours` — `collection`/`network`/prefs as step 1) → render the sharer avatars/names/posts under each card.
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
