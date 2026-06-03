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
Most endpoints take a `viewer`. Results are scoped to **the accounts that viewer follows** (their network). The follow graph is expanded server-side, so the request stays small no matter how many people the viewer follows.

The `viewer` is one of:
- A `did:` URI (e.g. `did:plc:abc…`) — for Bluesky users (and users who have both Bluesky and Mastodon — use the Bluesky DID).
- An ActivityPub Actor URI (e.g. `https://mastodon.social/users/alice`) — for Mastodon-only users.

The AppView treats `viewer` as an opaque stable identifier; it's used as a key in caches, `viewer_shares`, `viewer_prefs`, etc. Pick one form per user at signup and keep it. The format also determines whether the cold-viewer path tries to enqueue a Bluesky firehose backfill: only `did:plc:…` viewers do, since they're the only ones with an atproto repo to walk.

### Networks
The `network` param selects which follow graph(s) define "my network". Default is `bsky`. Comma-separated. Valid keys:
`bsky`, `tangled`, `grain`, `sprk`, `cosmik`, `sifa`, `rocksky`, `skyreader`, `standard`, `mastodon`.
Example: `?network=bsky,tangled` or `?network=bsky,mastodon`. Most consumers can ignore this and accept the `bsky` default.

**Mastodon is off-firehose.** Bluesky-style atproto networks are ingested live from Jetstream; Mastodon shares are pushed in by the consumer's worker via [`POST /v1/shares`](#post-v1shares). The API surface and `network=` filter behave identically for both, but Mastodon coverage is only as fresh as the worker's last push. There's no Bluesky-firehose equivalent for ActivityPub.

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

<a id="sourceid"></a>
**`sourceId` (viewer-scoped reads only)** — scope the response to a single content source (one of the viewer's custom feeds or lists). Two canonical forms:
- Bluesky feed or list: the at-URI verbatim (e.g. `?sourceId=at://did:plc:abc/app.bsky.feed.generator/whats-hot`).
- Mastodon list: `?sourceId=mastodon-list://<instance>/<id>` (e.g. `?sourceId=mastodon-list://mastodon.social/12345`).

When present, the follow-attributed branch is **skipped entirely** — the viewer is asking "what's trending in THIS feed/list", not "across my whole network", so follow-graph shares would dilute the answer. When absent (default), the response unions follow-attributed shares with ALL of the viewer's feed/list-attributed shares — today's behavior. Applies to `trending`, `latest`, `search`, `by-author`, `by-publication`, and `hydration`; ignored on network-wide (no-`viewer`) requests. The same canonical strings come back round-trip via `POST /v1/shares` — see the `source` discriminator there.

**Param encoding**: CSV params (`network`, `hideLabels`) use commas. Repeated params (`collection`, `hideUrls`, `hideDids`, `urls`) repeat the key: `?hideDids=did:plc:a&hideDids=did:plc:b`. Keep the total URL under ~16 KB (the caps above are tuned for this).

### Datetime format
Timestamps (`mostRecent`, `eventTime`, `publishedAt`) are ClickHouse-formatted UTC strings: `"2026-05-20 13:00:00.000"` (space separator, **no `T`/`Z`**). To parse in JS, treat as UTC:
```ts
const d = new Date(ts.replace(" ", "T") + "Z");
```

---

## 3. Response envelopes

**Paginated endpoints** (`trending`, `latest`, `search`, `by-author`, `by-publication`):
```ts
{ items: Item[]; cursor?: string; cold?: true }
```

`by-author` and `by-publication` additionally include an `about` summary card **on the first page only** (omitted once you paginate with a `cursor`, since it describes the whole result set, not a page):
```ts
{ items: Item[]; cursor?: string; cold?: true; about?: AboutCard }
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
  sharers: Sharer[];    // up to 1000 sharers, most-recent-share first (viewer-scoped endpoints only — see below)
  mostRecent: string;   // UTC datetime of the latest share
  giftUrl?: string;     // a gift/unlocked-article link, if a sharer used one (NYT/WaPo/etc.)
  // URL metadata — present only when the URL has been scraped; fields omitted when unknown:
  title?: string;
  description?: string;
  imageUrl?: string;    // preview/OG image URL
  siteName?: string;    // e.g. "The New York Times"
  byline?: string;      // article author(s) as one display string (e.g. "Jane Doe, John Smith")
  authors?: string[];   // the same authors split into individual names — render each as its
                        //   own link to /v1/by-author (which now matches any one co-author).
                        //   Omitted when none scraped; fall back to `byline` when absent.
  publishedAt?: string; // UTC datetime the article was published
  publisherIcon?: string; // the publisher's brand icon (app-icon/favicon) for this URL —
                          //   show it next to the URL for per-item publisher branding.
                          //   Omitted when the publisher isn't on file yet.
  publisherName?: string; // best-effort publisher name: the article's siteName when it
                          //   scraped, else the domain's primary publisher (so a URL whose
                          //   own scrape failed — paywalls, NYT — still names its publisher).
                          //   Prefer this over siteName for display.
}

interface Sharer {
  did: string;          // stable identifier; always present
  handle?: string;      // current handle, e.g. "reporter.bsky.social" — omitted when unknown
  name?: string;        // profile display name — omitted when unknown
}
```

### AboutCard (returned by `by-author` / `by-publication`, first page only)
A publication (by-publication) or journalist (by-author) summary, derived from the publisher identity layer plus a rollup over the same scope/window/filters as the listing. Use it to render a header card above the results.
```ts
interface AboutCard {
  name: string;          // publication display name (by-publication) or the matched author's name
                         //   (by-author — the individual co-author you searched, NOT the full byline);
                         //   falls back to the queried key when none is on file
  query: string;         // echo of what was queried — the domain, or the normalized author tokens
  faviconUrl?: string;   // publication icon (by-publication only) — its app-icon
                         //   (apple-touch-icon ~180px), falling back to its favicon
  homepageUrl?: string;  // publication homepage (by-publication only), from JSON-LD publisher.url
  description?: string;   // publication blurb (by-publication only); empty until the homepage-scrape lands
  did?: string;           // a Bluesky DID to link to an account:
                          //   by-publication (PRIMARY only) → the outlet's account (domain-as-handle,
                          //     else a verified brand match). Omitted for sub-brands / no match.
                          //   by-author → the journalist's account — a VERIFIED, uniquely-corroborated
                          //     match. Safe to present as "their account"; risky matches are withheld.
  account?: {             // the resolved account's full profile (present with `did`) — render directly
    did: string;
    handle?: string;
    displayName?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    description?: string;
  };
  authorUrl?: string;    // the journalist's page on the publication (by-author only), from author.url
  socials?: string[];    // the journalist's social-profile URLs (by-author only), from author.sameAs —
                         //   X / Bluesky / Mastodon / LinkedIn / personal site, deduped across articles
  publications?: string[]; // publications under this key, most-prominent first:
                         //   by-author → distinct site_names this byline writes for;
                         //   by-publication → the host's SIBLING publications, ranked by shares
                         //   (nytimes.com → ["The New York Times","The Athletic","Wirecutter",…]);
                         //   the drill-down menu to the host's other publications.
                         //   Omitted for by-publication when the host has only one publication.
  articleCount: number;  // distinct (canonical) articles shared in scope over the window
  shareCount: number;    // share events in scope over the window
  sharerCount: number;   // distinct accounts who shared, in scope over the window
}
```
The activity counts (`articleCount`/`shareCount`/`sharerCount`) follow the request's mode exactly: viewer-scoped (with `viewer`) counts within the viewer's network; network-wide (without `viewer`) counts across the whole index. A cold viewer returns the card with zero counts. The identity fields (`name`/`faviconUrl`/`homepageUrl`/`authorUrl`/`socials`/`publications`) describe the publisher/author and are populated from scraped page metadata (app-icon for `faviconUrl`, JSON-LD for the rest) — any of them is omitted when the underlying pages didn't declare it.
`avatars` holds **up to** 3 bsky.app CDN avatar URLs for accounts who shared the URL — for an avatar-preview face pile. It can be shorter than `shares` (and occasionally empty) because sharers without a set avatar are skipped; the first 3 from the most-recent-share-first ordering. **Exception**: `/v1/latest` items carry `eventTime` (UTC datetime of the most recent share) in place of `mostRecent`; they still include `shares`, `avatars`, and `sharers`, counted over the same `days`/`hours` window. Everything else is identical.

**`sharers`** lists distinct accounts that shared the URL within the window, ordered most-recent-share first, capped at 1000 (the safety belt — viral URLs in very active networks could exceed this). Each entry carries the stable `did`, and `handle`/`name` when known; either can be missing for accounts that haven't been fully indexed yet. **Emitted by `/v1/trending`, `/v1/latest`, `/v1/search`, `/v1/by-author`, and `/v1/by-publication`.** The set it draws from depends on the endpoint's mode: viewer-scoped requests (trending/latest, or search/by-author/by-publication *with* `viewer`) list sharers from the viewer's network; network-wide requests (search/by-author/by-publication *without* `viewer`) list sharers from the whole index. **`/v1/network-trending` deliberately omits this field** — the global feed's per-URL sharer list can run into the millions and isn't a useful UI primitive. For a full per-share render with record bodies + repost/quote subjects, use `/v1/hydration`.

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
  parent?: SubjectPost;  // for replies: the post being replied to (same shape; see below)
  sources?: string[];   // how this share reached the viewer — see "Source attribution" below
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

**Reply parent (`parent`).** When the share is a reply (`app.bsky.feed.post` with a `reply.parent`), `parent` is the post it replies to — resolved server-side into the same `SubjectPost` shape as `subject` (the immediate parent, not the thread root). If the parent is itself a quote/repost, its own referenced post is nested at `parent.subject` (one hop deep, same as `subject.subject`), so a reply to a quote post renders the quoted content too. It's **independent of `subject`**: a reply that also quotes carries both. Present only when the parent post is indexed (in-network or backfilled author); absent otherwise — fall back to rendering just the reply. Bluesky only; Mastodon reply parents aren't ingested, so `parent` is never set for `mastodon.*` collections. Appears on every per-share endpoint (`/v1/hydration`, `/v1/query` items, `/v1/actor-activity`) since it's intrinsic to the post, not viewer-relative.

**Source attribution (`sources`).** Each share carries the canonical source identifier(s) it reached the **requesting viewer** through — the *same strings* `?sourceId=` accepts, so you can map them straight back to your own feed/list records by string equality:
- `"follows"` — the follow graph / home timeline (includes Mastodon `source.kind: "follows"` shares).
- a Bluesky feed/list at-URI verbatim, e.g. `at://did:plc:abc/app.bsky.feed.generator/whats-hot`.
- `mastodon-list://<instance>/<id>`.

It's an **array** because the default (no-`sourceId`) response unions follow-attributed shares with all of the viewer's feed/list-attributed shares, and one share can be surfaced by more than one source — e.g. someone you follow whose post also appears in a list you subscribe to comes back as `["at://…", "follows"]` (distinct, sorted). Render one card and badge it with every source.

- **Where it appears**: `/v1/hydration` and `/v1/query` items (both viewer-scoped). **Omitted on `/v1/actor-activity`** (no viewer → no per-viewer attribution).
- With `?sourceId=` supplied it's redundant (every row is that source) but still populated.
- Additive/optional — existing consumers that ignore it are unaffected.

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
      "byline": "Jane Smith, John Doe",
      "authors": ["Jane Smith", "John Doe"],
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
URLs whose scraped article **byline** matches the given author (whole-token AND match, e.g. `Jane Smith` requires both tokens). Matches a **single** author on co-authored pieces too — searching one writer of a "Jane Smith and John Doe" byline returns it, attributed to the searched author.
- **Required**: `author` (2–128 chars).
- **`viewer` optional** (same viewer/network-wide modes as search).
- **Optional `minShares`** (int, 1–1000, default 1) — same semantics as `/v1/trending`: drop URLs with fewer than this many distinct sharers. Applied before ranking/pagination.
- **Optional `sort`** (`popularity` | `recency`, default `popularity`) — `popularity` sorts by shares desc then recency; `recency` sorts by latest-share desc. Keep `sort` constant across a paginated run (the cursor shape is tied to it).
- **First page** also returns an [`about`](#aboutcard-returned-by-by-author--by-publication-first-page-only) card (the card always describes the **whole** matched set — `minShares`/`sort` only affect the `items` listing, not the card) — the journalist's display byline, the `publications` they write for, and scoped activity counts:
```jsonc
{
  "items": [ /* UrlItem[] */ ],
  "about": {
    "name": "Jane Smith",
    "query": "jane smith",
    "publications": ["The New York Times", "The Atlantic"],
    "articleCount": 12, "shareCount": 18, "sharerCount": 9
  }
}
```

### `GET /v1/by-publication`
URLs from a single **publication** on a host. A host can carry several publications (`nytimes.com` → "The New York Times", "The Athletic", "Wirecutter"); this serves one at a time rather than mixing them.
- **Required**: `domain` — a bare hostname like `nytimes.com` (no scheme/path).
- **Optional `publication`** — a brand on that host (e.g. `The Athletic`). **Omitted → the domain's PRIMARY publication** (the umbrella brand, ranked by shares).
- **`viewer` optional** (same modes as search).
- Matches on each URL's **canonical** domain, so shares posted via link shorteners / redirects (bit.ly, t.co, …) that resolve to this hostname are counted — share counts here line up with what the same URL shows in trending.
- **Which articles belong to a publication:**
  - An explicit **sub-brand** (`publication=The Athletic`) is strict — only articles whose `site_name` is that brand.
  - The **primary** is the host MINUS its sub-brands, so an unbranded / paywalled / not-yet-scraped article (no usable `site_name`) falls to the primary instead of vanishing. Requesting the primary by name behaves the same way. For a single-brand host this is simply the whole host.
- **Optional `minShares`** (int, 1–1000, default 1) and **`sort`** (`popularity` | `recency`, default `popularity`) — same as `/v1/by-author` above; they affect only the `items` listing.
- **First page** also returns an [`about`](#aboutcard-returned-by-by-author--by-publication-first-page-only) card — the publication's name + favicon + homepage + blurb (from the `publisher_identity` dict), scoped activity counts, and the host's **sibling publications** in `publications` (the menu to drill into the others), ranked by shares. Omitted (`publications`) when the host has only one publication. (Each item also carries its own per-article `siteName`.)

> **Replaces `GET /v1/by-domain`.** The old endpoint mixed every brand on a host into one feed; this one serves a single publication and exposes the rest via `about.publications`. To reproduce the old "whole host" behaviour, call the primary (omit `publication`) on a single-brand host, or iterate `about.publications`.
```jsonc
// GET /v1/by-publication?domain=nytimes.com           → the primary (The New York Times)
// GET /v1/by-publication?domain=nytimes.com&publication=The%20Athletic → just The Athletic
{
  "items": [ /* UrlItem[] */ ],
  "about": {
    "name": "The New York Times",
    "query": "nytimes.com",
    "faviconUrl": "https://www.nytimes.com/apple-touch-icon.png",
    "homepageUrl": "https://www.nytimes.com",
    "publications": ["The New York Times", "The Athletic", "Wirecutter"],
    "articleCount": 27, "shareCount": 41, "sharerCount": 23
  }
}
```

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

### `GET /v1/actor-activity`
Per-actor link-share activity, reverse-chronological. Returns one entry per share the actor has made within the window, hydrated as a `ShareRow` — the same shape `/v1/hydration` returns, so the renderer reuses the same path. Open by actor; no `viewer` required. Useful for "show me @reporter's recent link shares" UI like notification cards or profile activity feeds.

- **Required**: `actor` — DID or ActivityPub Actor URI (same accepted shapes as `viewer`; see §2).
- **`days`**: 1–90, default **7** (wider than feed endpoints — natural use case is "recent activity", not "right now"). Use `hours` for sub-day.
- **`collection`**: repeated NSID filter — restrict to specific record types (e.g. `?collection=app.bsky.feed.post` for direct posts only, `?collection=app.bsky.feed.repost` for reposts only).
- **`limit`**: 1–100, default 20.
- **`cursor`**: opaque pagination cursor (see §2 Pagination).
- **Returns**: `{ items: ShareRow[]; cursor?: string }` — items ordered by event time desc.
- **Takedowns** (account + at-URI) apply globally. **No viewer-mute filtering** — that needs a `viewer`.

```
GET /v1/actor-activity?actor=did:plc:reporter&days=7&collection=app.bsky.feed.post&limit=20
```
```json
{
  "items": [
    {
      "url": "https://www.nytimes.com/2026/05/30/...",
      "actorDid": "did:plc:reporter",
      "actorHandle": "reporter.bsky.social",
      "collection": "app.bsky.feed.post",
      "atUri": "at://did:plc:reporter/app.bsky.feed.post/...",
      "eventTime": "2026-05-30 11:24:00.000",
      "record": "{...post body...}"
    }
  ],
  "cursor": "..."
}
```

### `GET /v1/url`
Bulk URL-metadata lookup. Returns one entry per input URL with the scraped metadata we have (title, description, image, site, byline/authors, publish date) — the same `UrlMetaProjection` shape every URL-keyed item carries on `/v1/trending` et al.

Use this when you need metadata for a list of URLs you already have (e.g. rendering a notification card for a URL Sill is already tracking outside the appview), without going through a viewer-scoped feed query.

- **No `viewer`, no `days`/`hours`** — metadata is per-URL and not viewer-scoped.
- **`urls`** — repeated param, 1–100 canonical URLs (each ≤2048 chars).
- **Returns**: `{ urls: Array<{ url: string; title?: string; description?: string; imageUrl?: string; siteName?: string; byline?: string; authors?: string[]; publishedAt?: string }> }` — **input order preserved**, so callers can pair by index. URLs we haven't scraped yet come back as `{ url }` only (metadata fields omitted, not null).

```
GET /v1/url?urls=https://www.nytimes.com/2026/05/30/...&urls=https://example.com/x
```
```json
{
  "urls": [
    {
      "url": "https://www.nytimes.com/2026/05/30/...",
      "title": "Climate Bill Passes Senate",
      "description": "Landmark emissions legislation",
      "imageUrl": "https://static01.nyt.com/.../hero.jpg",
      "siteName": "The New York Times",
      "byline": "A Reporter, Another Reporter",
      "authors": ["A Reporter", "Another Reporter"],
      "publishedAt": "2026-05-29T13:00:00.000Z"
    },
    {
      "url": "https://example.com/x"
    }
  ]
}
```

Backed by an in-process LRU (10-min TTL, 50k entries) shared with trending/hydration, so repeated calls for the same URLs are sub-ms. Cache-Control: public.

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
- **Where applied.** All viewer-scoped endpoints (`trending`, `latest`, viewer-mode `search`/`by-author`/`by-publication`, `hydration`). **Not** applied to `network-trending` or network-mode (no-`viewer`) requests — those are shared/global with no viewer to attribute mutes to.
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

### `POST /v1/shares`
Push a batch of link shares the caller observed for a viewer. The endpoint validates and enqueues to a durable Postgres queue; a separate worker drains the queue into ClickHouse asynchronously. **Returns 202 Accepted** — writes are at-least-once and visible in `/v1/trending` et al within a few seconds (queue latency, not per-write).

This is how non-firehose share streams reach the AppView:
- **Mastodon timeline / lists / custom feeds** (no firehose exists).
- **Bluesky lists and custom feeds** (the Jetstream firehose only carries the global timeline; list/feed members have to be requested via the viewer's PDS).

**Body** (JSON):
```ts
{
  viewer: string;                  // the Sill user this batch is on behalf of (DID or ActivityPub Actor URI — see §2)
  shares: Array<{
    url: string;                   // the URL being shared
    network: "mastodon" | "bsky";  // which network the share came from (default: mastodon)
    // Where the viewer saw it (default: {kind: "follows"}).
    //   `follows`        — home timeline; writes to link_posts + synthesizes a follow.
    //   `at-uri`         — a Bluesky custom feed or list (the at-URI of the feed/list).
    //   `mastodon-list`  — a Mastodon list, identified by {instance, id}.
    // Storage canonicalizes the non-`follows` kinds to a single string:
    //   at-uri        → the at-URI verbatim
    //   mastodon-list → `mastodon-list://<instance>/<id>`
    // — used as the read-side `?sourceId=` filter (see §5).
    source:
      | { kind: "follows" }
      | { kind: "at-uri";        uri: string }                          // bsky feed or list
      | { kind: "mastodon-list"; instance: string; id: string };        // mastodon list

    // The post that contains the URL.
    //   - Plain post: the timeline entry itself.
    //   - Reblog: the ORIGINAL (reblogged-from) post.
    //   - Quote post: the quoter's post (contains the URL in its text).
    post: {
      uri:       string;           // http(s) URL (Mastodon) or at:// URI (Bluesky)
      text:      string;
      createdAt: string;           // ISO-8601 datetime
    };

    // Author of `post` (the URL-bearing post).
    actor: {
      id:          string;         // ActivityPub Actor URI (Mastodon) or did:... (Bluesky)
      handle:      string | null;
      displayName: string | null;
      avatarUrl:   string | null;
    };

    // Optional: present ONLY when the timeline entry was a reblog. The
    // reblogger gets the share credit; `actor` (above) is the ORIGINAL author.
    repost?: { actor: <Actor>; createdAt: string };

    // Optional: present when the post quotes another. `actor` is the QUOTER;
    // `quoted` carries the quoted post and its author.
    quoted?: { actor: <Actor>; post: <Post> };
  }>;  // 1..2000 entries
}
```

**Source rules**:
- `{kind: "follows"}` — the viewer's home timeline. Writes to the main shares table and **synthesizes an implicit follow** (`viewer` → `actor.id`) so trending counts it as a follow-attributed share.
- `{kind: "at-uri", uri}` / `{kind: "mastodon-list", instance, id}` — a custom feed or curated list the viewer subscribes to. Writes to a separate per-viewer table (`viewer_shares`) and **does NOT** synthesize a follow (the viewer may not actually follow the actor). Trending surfaces it for THIS viewer only. The identifier is canonicalized into a single string used as the read-side `?sourceId=` filter — see [§5 `?sourceId`](#sourceid).

**Reblog and quote semantics** mirror atproto:
- A repost-of-quote (Mastodon: reblog of a quote post) sends both `repost` and `quoted` on the same share. The synthesized record carries `subject.subject` so `/v1/hydration` returns both hops.
- Mastodon subjects are stored inline in the synthesized record (Mastodon URIs don't decompose into the (did, collection, rkey) key our records table uses), so hydration assembles `subject` without an extra round-trip.

**Caps & limits (single-viewer)**: up to 2000 shares per request.

**Batched form (recommended for continuous workers).** For pushers processing many viewers per pass, send one request with all viewers' batches in it. The API issues a single PG bulk-INSERT and the drainer processes them the same way as N independent requests — no behavioural difference, just fewer round-trips.

```ts
// Body alternative form:
{
  batches: Array<{
    viewer: string;
    shares: Share[];   // same shape as single-viewer
  }>;                  // 1..1000 entries
}
```

Response shape mirrors the request — single-viewer in, single-viewer out; batched in, batched out:
```ts
// Single-viewer body → response:
{ accepted: number, queueId: number }

// Batched body → response:
{ accepted: number /* total across all batches */, batches: number /* viewer count */, queueIds: number[] }
```

Both bodies are accepted on the same endpoint; pick whichever matches your worker pattern. Batched is recommended when pushing >50 viewers per pass — at 400 viewers/pass it saves ~200 ms of round-trip per pass.

```
POST /v1/shares
Content-Type: application/json
X-API-Key: …

{
  "viewer": "did:plc:abc",
  "shares": [
    {
      "url": "https://www.nytimes.com/2026/05/29/...",
      "network": "mastodon",
      "source": { "kind": "follows" },
      "post": {
        "uri":       "https://mastodon.social/@reporter/123456",
        "text":      "Important read:",
        "createdAt": "2026-05-29T13:00:00.000Z"
      },
      "actor": {
        "id":          "https://mastodon.social/users/reporter",
        "handle":      "reporter@mastodon.social",
        "displayName": "A Reporter",
        "avatarUrl":   "https://files.mastodon.social/.../avatar.png"
      }
    },
    {
      "url": "https://www.theatlantic.com/2026/05/28/...",
      "network": "mastodon",
      "source": { "kind": "mastodon-list", "instance": "mastodon.social", "id": "12345" },
      "post": {
        "uri":       "https://mastodon.social/@critic/789",
        "text":      "Worth your time:",
        "createdAt": "2026-05-29T14:00:00.000Z"
      },
      "actor": {
        "id":          "https://mastodon.social/users/critic",
        "handle":      "critic@mastodon.social",
        "displayName": "A Critic",
        "avatarUrl":   null
      }
    }
  ]
}
```
```json
{ "accepted": 1, "queueId": 4271 }
```

### `POST /v1/query`
**Notification-group query**, for Sill's custom notifications feature. Each request carries a list of `NotificationQuery` predicates (`category` + `operator` + `value`) which the appview AND's together and evaluates against the viewer's last N hours (default 24h, max 168h). Returns one entry per matching canonical URL with the individual matching shares fully hydrated.

**Body**:
```ts
{
  viewer: string;           // DID or ActivityPub Actor URI (see §2)
  hours?: number;           // 1–168, default 24
  limit?: number;           // 1–100, default 50 (cap on URLs returned)
  queries: NotificationQuery[];  // 1–20 predicates, AND'd together
}
```

A `NotificationQuery` is one predicate. The `category.id` drives operator + value validation:

| `category.id` | type | operators | value | column / matched expression |
|---|---|---|---|---|
| `url`     | string | `equals`, `contains`, `excludes` | `string` | the URL being shared (case-insensitive substring) |
| `link`    | string | `equals`, `contains`, `excludes` | `string` | `url_metadata.title` **OR** `url_metadata.description` (either matches) |
| `shares`  | number | `equals`, `greaterThan`, `greaterThanEqual` | `number` (int ≥0) | distinct-sharer count **over the surviving set** (see "AND semantics" below) |
| `author`  | string | `equals`, `contains`, `excludes` | `string` | sharer handle, restricted to **direct posts** (excludes reposts) |
| `post`    | string | `equals`, `contains`, `excludes` | `string` | post body text |
| `repost`  | string | `equals`, `contains`, `excludes` | `string` | sharer handle, restricted to **repost actions** (the reposter, not the original author) |
| `service` | enum   | `equals`, `excludes` | `"bluesky" \| "mastodon"` | the network the share came from |
| `list`    | enum   | `equals`, `excludes` | canonical sourceId (`at://…` or `mastodon-list://<instance>/<id>`) | a specific feed/list the viewer subscribes to. `equals` restricts to viewer_shares from that list (follow-attributed shares are skipped entirely); `excludes` removes shares from that list. |

The `category` object also accepts `name`, `type`, and `values` fields (Sill's client passes them through) — the server ignores them. Only `category.id` drives dispatch. String operators are case-insensitive on the SQL side.

**AND semantics**. Predicates are AND'd: a share must satisfy every predicate to count, and the `shares` count is evaluated over **that filtered set**. So `post contains "climate" AND shares >= 5` means "5+ distinct accounts each shared something whose post text mentions climate", NOT "this URL has 5+ total shares and at least one mentions climate". This is the natural reading of "all queries succeed" and matches what users mean by "notify me when 5 people are talking about X".

**`author` vs `repost`**. These are complementary, not equivalent. `author = X` matches shares where X is the post author (direct posts only — i.e. NOT reposts). `repost = X` matches shares where X is the reposter (reposts only). A query with both would always match the empty set since a share can't be both at once.

**Response** (per-URL grouped). The per-URL fields mirror the shape `/v1/trending` returns for each `UrlItem` — minus `sharers` (the per-URL sharer list, which `items` makes redundant) and plus `items` (the actual hydrated matching shares):

```ts
{
  matches: Array<{
    url: string;                // canonical
    shares: number;             // distinct-sharer count in the filtered set
    mostRecent: string;         // latest matching share time — CH UTC string "YYYY-MM-DD HH:MM:SS.fff" (see §2 Datetime)
    avatars: string[];          // up to 3 most-recent distinct sharer avatars (face-pile)
    // URL metadata — same fields trending exposes via UrlMetaProjection.
    // Omitted (not null) when not yet scraped or absent on the page.
    title?: string;
    description?: string;
    imageUrl?: string;
    siteName?: string;
    byline?: string;
    authors?: string[];
    publishedAt?: string;
    items: ShareRow[];          // hydrated, same shape as /v1/hydration
  }>;
  cold?: true;                  // pre-backfill empty result (retry shortly)
}
```

Sort is `shares DESC, mostRecent DESC` on `matches`. Per-URL `items` ordered by event time desc, capped at 200 per URL — `mostRecent` is computed in ClickHouse, so it stays accurate even when `items` is capped.

```
POST /v1/query
Content-Type: application/json
X-API-Key: …

{
  "viewer": "did:plc:abc",
  "hours": 24,
  "queries": [
    { "category": { "id": "post" },   "operator": "contains", "value": "climate" },
    { "category": { "id": "shares" }, "operator": "greaterThanEqual", "value": 3 }
  ]
}
```
```json
{
  "matches": [
    {
      "url": "https://www.nytimes.com/2026/05/29/climate-bill-passes",
      "shares": 4,
      "mostRecent": "2026-05-30 11:24:00.000",
      "avatars": [
        "https://cdn.bsky.app/.../avatar1.jpeg",
        "https://cdn.bsky.app/.../avatar2.jpeg",
        "https://cdn.bsky.app/.../avatar3.jpeg"
      ],
      "title": "Climate Bill Passes Senate",
      "description": "Landmark emissions legislation",
      "imageUrl": "https://static01.nyt.com/.../hero.jpg",
      "siteName": "The New York Times",
      "byline": "A Reporter",
      "publishedAt": "2026-05-29T13:00:00.000Z",
      "items": [/* ShareRow[] — see §6 */]
    }
  ]
}
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
- `mastodon.status` — a Mastodon post (plain or quote). The synthesized record body has `text`, `createdAt`, `uri`. Permalink target is `atUri` (a Mastodon HTTP URL — use as-is, no bsky.app construction). When `subject` is set, it's the quoted post.
- `mastodon.repost` — a Mastodon reblog. The reposted post is in `subject`, same convention as `app.bsky.feed.repost`. `record` here just has `createdAt` (the reblog event time) plus the inline `subject`.

**`subject` (reposts & quotes):** the AppView resolves the referenced post for you — `subject.record` is the full post (JSON.parse it the same as `record`), with `subject.actorDid`/`actorHandle`/`actorName`/`actorAvatar` for its author. It's **absent** only when that post isn't indexed (out-of-network author); in that case fall back to the bare pointer in `record.subject.uri` / the embed. Resolution goes up to **two levels**: a share's `subject`, plus that subject's own `subject` when the subject is itself a quote/repost — e.g. a **repost of a quote post** resolves both the quote post (`subject`) and the quoted post (`subject.subject`). It stops there; a third level isn't expanded.

So a typical URL card shows: the URL's `title`/`imageUrl`/`siteName` (from the trending/latest item), then a row of the network members who shared it (from hydration: avatar + name + link to their post), and optionally a "read free" link if `giftUrl` is present.

---

## 7. Typical frontend flow

1. **List view** — `GET /v1/trending?viewer=<did>&days=1` → URL cards with metadata, share counts, and `sharers[]` (handles + names) for everyone in the viewer's network who shared each URL. For a face-pile + "shared by Jane, John, and 12 others" UI, no second call is needed.
   - If `cold: true` → show "indexing your network…" and retry shortly.
2. **Per-share rendering** — if you want to render each sharer's post text / quote / repost subject (not just their identity), `GET /v1/hydration?viewer=<did>&days=1&urls=<u1>&urls=<u2>…` (same `viewer`, time window — `days` or `hours` — `collection`/`network`/prefs as step 1) → returns the full `ShareRow[]` with record bodies + subject posts.
3. **Pagination** — pass the trending `cursor` back as `?cursor=…` for the next page; stop when no `cursor` is returned.
4. **Search / filters** — `/v1/search`, `/v1/by-author`, `/v1/by-publication` for discovery; `hideDids`/`hideUrls`/`hideLabels` to honour user mutes/moderation.
5. **Pushing non-firehose shares** — for Mastodon timelines/lists/feeds and Bluesky lists/custom-feeds, run a worker that fetches per viewer and `POST /v1/shares` the results. Use `network` and `source` to tell the AppView whether to treat them as follow-attributed (writes implicit follows) or viewer-scoped (no follow inferred). All other endpoints then return a unified view across both Bluesky firehose and your pushed shares.

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
