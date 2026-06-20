import { and, eq } from "drizzle-orm";
import { createRestAPIClient, type mastodon } from "masto";
import { isSubscribed } from "@sill/auth";
import {
  blueskyAccount,
  db,
  list,
  mastodonAccount,
  type AccountWithInstance,
  type ListOption,
} from "@sill/schema";
import type {
  PushShare,
  PushShareBatch,
  PushShareSource,
} from "./appview.js";
import { mastodonActorUri } from "./viewer.js";

const REDIRECT_URI = process.env.MASTODON_REDIRECT_URI as string;
const ONE_DAY_MS = 86400000; // 24 hours in milliseconds
// Hard cap on how many statuses we page through in a single timeline pull. The
// 24h stop condition below ignores reblogs (it only stops on an older *original*
// post), so a reblog-heavy feed — or a cursor that fell behind during a gap —
// can otherwise paginate backwards almost without end, blow past the fetch
// timeout, and leave the cursor un-advanced. That is how Mastodon-only digests
// got frozen at the June 3 AppView cutover. We keep the most recent N and stop;
// the cursor still advances to the newest status, so the next pass is small and
// the feed un-sticks itself.
const MAX_TIMELINE_STATUSES = 1000;

/**
 * Epoch-ms a Mastodon status was created, from its Snowflake ID (`id >> 16`).
 * For a reblog the ID is the *boost's* — i.e. when it entered the timeline — so
 * this reflects timeline position, which is what we page by. Returns null for
 * non-Mastodon instances (Pleroma / GoToSocial) whose IDs aren't numeric
 * Snowflakes; callers fall back to the post's own `createdAt`.
 */
const snowflakeMs = (id: string): number | null => {
  if (!/^[0-9]+$/.test(id)) return null;
  try {
    return Number(BigInt(id) >> 16n);
  } catch {
    return null;
  }
};

/**
 * The newer of two status IDs. For numeric (Mastodon-core) IDs that's the larger
 * Snowflake, regardless of the order the API returned the page in; otherwise keep
 * the one already held (the first seen — the page head under the API's default
 * newest-first order). Tracks the true timeline head so the cursor can advance to
 * it independent of which statuses we accept for ingestion.
 */
const newerStatusId = (held: string | null, next: string): string => {
  if (held === null) return next;
  const a = snowflakeMs(held);
  const b = snowflakeMs(next);
  if (a !== null && b !== null) return b > a ? next : held;
  return held;
};

/**
 * Constructs the authorization URL for a given Mastodon instance
 * @param instance Mastodon instance URL
 * @returns Authorization URL for the Mastodon instance
 */
export const getAuthorizationUrl = (instance: string, clientId: string) => {
  return `https://${instance}/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&instance=${encodeURIComponent(instance)}`;
};

/**
 * Fetches the OAuth token from a Mastodon instance given an authorization code
 * @param instance Mastodon instance URL
 * @param code Authorization code
 * @returns OAuth token data
 */
export const getAccessToken = async (
  instance: string,
  code: string,
  clientId: string,
  clientSecret: string
) => {
  const response = await fetch(`https://${instance}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      code,
      grant_type: "authorization_code",
    }),
  });
  return await response.json(); // This will include access_token, token_type, etc.
};

/**
 * Fetches the Mastodon timeline for a given user
 * Either fetches all statuses since the last fetch, or all statuses from the last 24 hours
 * @param userId ID for the logged-in user
 * @returns List of statuses from the user's Mastodon timeline since last fetch
 */

export const getMastodonList = async (
  listUri: string,
  account: typeof mastodonAccount.$inferSelect & {
    mastodonInstance: {
      instance: string;
    };
  },
  opts?: { ignoreCursor?: boolean }
): Promise<mastodon.v1.Status[]> => {
  const yesterday = new Date(Date.now() - ONE_DAY_MS);

  const dbList = await db.query.list.findFirst({
    where: eq(list.uri, listUri),
  });

  if (!dbList) return [];

  const client = createRestAPIClient({
    url: `https://${account.mastodonInstance.instance}`,
    accessToken: account.accessToken,
  });

  const profile = await client.v1.accounts.verifyCredentials();

  const timeline: mastodon.v1.Status[] = [];
  let ended = false;
  let seen = 0;
  let newestSeenId: string | null = null;

  // Same stale-cursor handling as getMastodonTimeline: only use sinceId when the
  // list cursor is fresh; otherwise fetch newest-first and advance to the newest
  // status seen.
  const cursorMs = dbList.mostRecentPostId
    ? snowflakeMs(dbList.mostRecentPostId)
    : null;
  const cursorIsFresh = cursorMs !== null && cursorMs > yesterday.getTime();
  for await (const statuses of client.v1.timelines.list.$select(listUri).list({
    sinceId:
      !opts?.ignoreCursor && cursorIsFresh
        ? (dbList.mostRecentPostId ?? undefined)
        : undefined,
    limit: 40,
  })) {
    if (ended) break;
    for await (const status of statuses) {
      // Bounded pagination: never run away on a reblog-heavy feed or a stale
      // cursor (see MAX_TIMELINE_STATUSES).
      if (seen >= MAX_TIMELINE_STATUSES) {
        ended = true;
        break;
      }
      seen++;
      newestSeenId = newerStatusId(newestSeenId, status.id);
      if (status.account.username === profile.username) continue;
      if (status.reblog?.account.username === profile.username) continue;

      // Stop once we reach posts older than the 24h window. Page by the status
      // ID's Snowflake time (when it entered the timeline — the boost time for a
      // reblog), so a reblog-heavy feed stops here instead of paging back almost
      // without end. The old `!status.reblog` guard let those feeds run away,
      // which is what froze cursors at the AppView cutover. Non-Mastodon
      // instances have non-numeric IDs, so fall back to the post's own createdAt,
      // still skipping reblogs/flipboard whose createdAt misleads.
      const statusMs = snowflakeMs(status.id);
      const tooOld =
        statusMs !== null
          ? statusMs <= yesterday.getTime()
          : new Date(status.createdAt) <= yesterday &&
            status.account.acct.split("@")[1] !== "flipboard.com" &&
            !status.reblog;
      if (tooOld) {
        ended = true;
        break;
      }
      if (status.id === dbList.mostRecentPostId) {
        ended = true;
        break;
      }

      timeline.push(status);
    }
  }

  // Advance to the newest status seen (decoupled from the filtered set), so an
  // all-out-of-window page can't freeze the list cursor. See getMastodonTimeline.
  if (newestSeenId && newestSeenId !== dbList.mostRecentPostId) {
    await db
      .update(list)
      .set({ mostRecentPostId: newestSeenId })
      .where(
        and(eq(list.mastodonAccountId, account.id), eq(list.uri, listUri))
      );
  }
  return timeline;
};

export const getMastodonTimeline = async (
  account: typeof mastodonAccount.$inferSelect & {
    mastodonInstance: {
      instance: string;
    };
  },
  opts?: { ignoreCursor?: boolean }
): Promise<mastodon.v1.Status[]> => {
  const yesterday = new Date(Date.now() - 86400000); // 24 hours

  let client: mastodon.rest.Client | null = null;

  try {
    client = createRestAPIClient({
      url: `https://${account.mastodonInstance.instance}`,
      accessToken: account.accessToken,
    });
  } catch (e) {
    console.error("Error creating Mastodon client", e);
    return [];
  }

  const profile = await client.v1.accounts.verifyCredentials();

  const timeline: mastodon.v1.Status[] = [];
  let ended = false;
  let seen = 0;
  // The newest status we lay eyes on, before any filtering. The cursor advances
  // to THIS, not to the newest *accepted* status — see the update below.
  let newestSeenId: string | null = null;

  // Use the stored cursor as `sinceId` only when it's fresh (within the 24h
  // window). A stale cursor makes Mastodon return a huge gap of statuses and, in
  // practice, an empty *accepted* timeline (the page comes back such that the
  // first in-window check stops the loop), so the cursor never advanced and the
  // account froze — confirmed via the VERIFY path. For a stale (or non-numeric,
  // or absent) cursor we drop sinceId and fetch newest-first, the path that
  // reliably returns fresh statuses, then advance to the newest one seen.
  const cursorMs = account.mostRecentPostId
    ? snowflakeMs(account.mostRecentPostId)
    : null;
  const cursorIsFresh = cursorMs !== null && cursorMs > yesterday.getTime();
  const listParams: { limit: number; sinceId?: string } = { limit: 40 };
  if (!opts?.ignoreCursor && cursorIsFresh && account.mostRecentPostId) {
    listParams.sinceId = account.mostRecentPostId;
  }

  for await (const statuses of client.v1.timelines.home.list(listParams)) {
    if (ended) break;
    for await (const status of statuses) {
      // Bounded pagination: never run away on a reblog-heavy feed or a stale
      // cursor (see MAX_TIMELINE_STATUSES).
      if (seen >= MAX_TIMELINE_STATUSES) {
        ended = true;
        break;
      }
      seen++;
      newestSeenId = newerStatusId(newestSeenId, status.id);
      if (status.account.username === profile.username) continue;
      if (status.reblog?.account.username === profile.username) continue;

      // Stop once we reach posts older than the 24h window. Page by the status
      // ID's Snowflake time (when it entered the timeline — the boost time for a
      // reblog), so a reblog-heavy feed stops here instead of paging back almost
      // without end. The old `!status.reblog` guard let those feeds run away,
      // which is what froze cursors at the AppView cutover. Non-Mastodon
      // instances have non-numeric IDs, so fall back to the post's own createdAt,
      // still skipping reblogs/flipboard whose createdAt misleads.
      const statusMs = snowflakeMs(status.id);
      const tooOld =
        statusMs !== null
          ? statusMs <= yesterday.getTime()
          : new Date(status.createdAt) <= yesterday &&
            status.account.acct.split("@")[1] !== "flipboard.com" &&
            !status.reblog;
      if (tooOld) {
        ended = true;
        break;
      }
      if (status.id === account.mostRecentPostId) {
        ended = true;
        break;
      }

      timeline.push(status);
    }
  }

  // Advance the cursor to the newest status SEEN, decoupled from whether any
  // were accepted for ingestion. Gating on `timeline.length > 0` (the filtered,
  // in-window set) froze accounts whose newest statuses were all out-of-window /
  // own / self-reblogs: the filtered set was empty so the cursor never moved.
  // Only write when it actually moves forward.
  if (newestSeenId && newestSeenId !== account.mostRecentPostId) {
    await db
      .update(mastodonAccount)
      .set({ mostRecentPostId: newestSeenId })
      .where(eq(mastodonAccount.id, account.id));
  }

  return timeline;
};

export interface MastodonProbe {
  userId: string;
  instance: string | null;
  username: string | null;
  /** verifyCredentials + one home-timeline page both succeeded. */
  ok: boolean;
  /** Error class + message when the probe failed (dead token, instance down…). */
  error: string | null;
  /** Statuses on the first home-timeline page. 0 with ok=true means an empty feed. */
  statuses: number;
  /** ISO time of the newest status seen — what a real fetch's cursor would advance toward. */
  newestStatusAt: string | null;
  /** The currently-stored cursor, for context. */
  cursor: string | null;
  // --- Real-path replay: fetch WITH the stored sinceId, exactly like
  // getMastodonTimeline, read-only. This is what actually runs in the worker and
  // where the freeze hides (the plain probe above omits sinceId, so it can't see
  // it). `cursorPageFirstAt`/`cursorPageLastAt` reveal the order the API returns
  // statuses for a stale sinceId (newest-first vs oldest-first).
  /** Raw statuses the API returned on the first page when queried with sinceId. */
  cursorPageCount: number;
  /** createdAt of the first and last status on that page (to read the ordering). */
  cursorPageFirstAt: string | null;
  cursorPageLastAt: string | null;
  /** Would the real loop produce a non-empty timeline → advance the cursor? */
  cursorWouldAdvance: boolean;
  /** If so, to when (decoded from the new cursor id); else why it stayed empty. */
  cursorOutcome: string;
}

/**
 * Read-only diagnosis of one Mastodon account: does the token still work, and
 * does the home timeline return anything? Unlike the ingestion path
 * (`getLinksFromMastodon`), this does NOT swallow errors and does NOT mutate the
 * cursor — it surfaces exactly why an account can or can't be fetched, so a
 * frozen cursor can be classified as dead-token vs dead-instance vs empty-feed.
 */
export const probeMastodonAccount = async (
  userId: string,
): Promise<MastodonProbe> => {
  const account = await db.query.mastodonAccount.findFirst({
    where: eq(mastodonAccount.userId, userId),
    with: { mastodonInstance: true },
  });
  const empty = {
    statuses: 0,
    newestStatusAt: null,
    cursorPageCount: 0,
    cursorPageFirstAt: null,
    cursorPageLastAt: null,
    cursorWouldAdvance: false,
    cursorOutcome: "-",
  };
  if (!account) {
    return {
      userId,
      instance: null,
      username: null,
      ok: false,
      error: "no_mastodon_account",
      cursor: null,
      ...empty,
    };
  }

  const base = {
    userId,
    instance: account.mastodonInstance.instance,
    username: account.username,
    cursor: account.mostRecentPostId,
  };

  try {
    const client = createRestAPIClient({
      url: `https://${account.mastodonInstance.instance}`,
      accessToken: account.accessToken,
    });
    const profile = await client.v1.accounts.verifyCredentials(); // throws on a revoked/expired token

    // (1) Plain fetch, no sinceId — proves the token works and the feed has data.
    let statuses = 0;
    let newestStatusAt: string | null = null;
    for await (const page of client.v1.timelines.home.list({ limit: 40 })) {
      for (const status of page) {
        if (newestStatusAt === null) newestStatusAt = status.createdAt;
        statuses++;
      }
      break;
    }

    // (2) Real-path replay: fetch the FIRST page WITH the stored sinceId, and
    // run the same accept/stop logic getMastodonTimeline uses, read-only. This
    // is the experiment — it shows whether a stale sinceId yields a non-empty
    // timeline (cursor advances) or an empty one (frozen), and the page order.
    const yesterday = Date.now() - 86400000;
    let cursorPageCount = 0;
    let cursorPageFirstAt: string | null = null;
    let cursorPageLastAt: string | null = null;
    let firstAccepted: mastodon.v1.Status | null = null;
    let stopReason = "endOfPage";
    if (account.mostRecentPostId) {
      pages: for await (const page of client.v1.timelines.home.list({
        limit: 40,
        sinceId: account.mostRecentPostId,
      })) {
        for (const status of page) {
          cursorPageCount++;
          if (cursorPageFirstAt === null) cursorPageFirstAt = status.createdAt;
          cursorPageLastAt = status.createdAt;
          if (status.account.username === profile.username) continue;
          if (status.reblog?.account.username === profile.username) continue;
          const ms = snowflakeMs(status.id);
          const tooOld =
            ms !== null
              ? ms <= yesterday
              : new Date(status.createdAt).getTime() <= yesterday &&
                !status.reblog;
          if (tooOld) {
            stopReason = "tooOld";
            break pages;
          }
          if (status.id === account.mostRecentPostId) {
            stopReason = "matchedCursor";
            break pages;
          }
          if (firstAccepted === null) firstAccepted = status; // = timeline[0]
        }
        break; // first page is enough to see the outcome
      }
    } else {
      stopReason = "noCursor";
    }

    const cursorWouldAdvance = firstAccepted !== null;
    const cursorOutcome = firstAccepted
      ? `advance→${new Date(Number(BigInt(firstAccepted.id) >> 16n)).toISOString()}`
      : `frozen (${stopReason}, page=${cursorPageCount})`;

    return {
      ...base,
      ok: true,
      error: null,
      statuses,
      newestStatusAt,
      cursorPageCount,
      cursorPageFirstAt,
      cursorPageLastAt,
      cursorWouldAdvance,
      cursorOutcome,
    };
  } catch (e) {
    const error =
      e instanceof Error ? `${e.constructor.name}: ${e.message}` : String(e);
    return { ...base, ok: false, error: error.slice(0, 300), ...empty };
  }
};

/**
 * Searches for YouTube URLs in the content of a Mastodon post
 * Mastodon returns broken preview cards for YouTube URLs, so this is a workaround
 * @param content Content from the Mastodon post
 * @returns Youtube URL or null
 */
const getYoutubeUrl = async (content: string): Promise<string | null> => {
  const regex =
    /(https:\/\/(?:www\.youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+(?:<[^>]+>)*[\w-]+(?:\?(?:[\w-=&]+(?:<[^>]+>)*[\w-=&]+)?)?)/g;
  const youtubeUrls = content.match(regex);
  return youtubeUrls ? youtubeUrls[0] : null;
};

const isObj = (v: unknown): v is Record<string, unknown> => {
  return typeof v === "object" && v !== null;
};

function hasProp<K extends PropertyKey>(
  data: object,
  prop: K
): data is Record<K, unknown> {
  return prop in data;
}

export const isQuote = (
  quote: mastodon.v1.Quote | mastodon.v1.ShallowQuote | null | undefined
): quote is mastodon.v1.Quote => {
  return (
    isObj(quote) && hasProp(quote, "quotedStatus") && quote.state === "accepted"
  );
};

/** Defensive clip for actor.handle (AppView rejects > 512 chars). */
const HANDLE_MAX = 512;
const clipHandle = (h: string | null | undefined): string | null => {
  if (!h) return null;
  return h.length > HANDLE_MAX ? h.slice(0, HANDLE_MAX) : h;
};

/**
 * Build the `/v1/shares` payload for one Mastodon timeline/list entry. Returns
 * null when there's no card (no link) or the card points to a gif. URL is
 * normalised (shortener expansion); the AppView re-canonicalises.
 */
export const processMastodonLink = async (
  t: mastodon.v1.Status,
  source: PushShareSource,
): Promise<PushShare | null> => {
  const original = t.reblog || t;
  const postUrl = original.url;
  const quote = isQuote(t.quote) ? t.quote : null;
  const card = quote?.quotedStatus?.card || original.card;
  if (!postUrl || !card) return null;

  if (card.url === "https://www.youtube.com/undefined") {
    const youtubeUrl = await getYoutubeUrl(original.content);
    if (youtubeUrl) card.url = youtubeUrl;
  }
  if (card.url.includes(".gif")) return null;
  // AppView canonicalises (shortener expansion, tracking-param strip, etc.).
  const url = card.url;

  // `actor.id` is required and must be a non-empty string. Skip the share
  // entirely if the upstream is missing the actor URL.
  if (!original.account.url) return null;

  const share: PushShare = {
    url,
    network: "mastodon",
    source,
    post: {
      uri: postUrl,
      // Mastodon's `content` is already HTML (the form Sill's renderer expects
      // via `dangerouslySetInnerHTML`). Send it through unchanged — the
      // AppView's `/v1/search` tokenizer ignores tag noise.
      text: original.content,
      createdAt: original.createdAt,
    },
    actor: {
      // ActivityPub Actor URI: `account.url` is the canonical profile URL,
      // which doubles as the actor identifier on the federated graph.
      id: original.account.url,
      handle: clipHandle(original.account.acct),
      displayName: original.account.displayName ?? null,
      avatarUrl: original.account.avatar ?? null,
    },
  };

  if (t.reblog && t.account.url) {
    share.repost = {
      actor: {
        id: t.account.url,
        handle: clipHandle(t.account.acct),
        displayName: t.account.displayName ?? null,
        avatarUrl: t.account.avatar ?? null,
      },
      createdAt: t.createdAt,
    };
  }

  // Skip the quoted block entirely when we can't supply a real post URI or
  // actor URI — the AppView's validator rejects empty/missing strings on
  // those required fields.
  if (quote && quote.quotedStatus) {
    const q = quote.quotedStatus;
    if (q.url && q.account.url) {
      share.quoted = {
        actor: {
          id: q.account.url,
          handle: clipHandle(q.account.acct),
          displayName: q.account.displayName ?? null,
          avatarUrl: q.account.avatar ?? null,
        },
        post: {
          uri: q.url,
          text: q.content,
          createdAt: q.createdAt,
        },
      };
    }
  }

  return share;
};

/**
 * Collect observed Mastodon timeline + list shares for a viewer. Returns a
 * single `{viewer, shares}` batch, or null when nothing was observed.
 * The AppView `viewer` key is the user's Bluesky DID when they have one, else
 * their Mastodon ActivityPub actor URI (so Mastodon-only users are ingested
 * too). Returns null only when neither identity is available.
 */
/**
 * Recover a missing Mastodon `username` from the live profile and persist it.
 *
 * Some accounts were stored with an empty `username` (a signup/migration data
 * gap). That left them un-ingestable: the AppView viewer key for a Mastodon-only
 * user is their actor URI, which needs the username, so `getLinksFromMastodon`
 * resolved `viewer` to null and bailed *before fetching* — the cursor never
 * advanced and the account's digest froze. `verifyCredentials` returns the
 * username whenever the token is alive, so we read it from there and write it
 * back, which unblocks both ingestion and the AppView read path (resolveViewer).
 * Returns the recovered username, or null if the token is dead / the call fails.
 */
const recoverMastodonUsername = async (
  account: typeof mastodonAccount.$inferSelect & {
    mastodonInstance: { instance: string };
  },
): Promise<string | null> => {
  try {
    const client = createRestAPIClient({
      url: `https://${account.mastodonInstance.instance}`,
      accessToken: account.accessToken,
    });
    const profile = await client.v1.accounts.verifyCredentials();
    const username = profile.username?.trim();
    if (!username) return null;
    await db
      .update(mastodonAccount)
      .set({ username })
      .where(eq(mastodonAccount.id, account.id));
    console.log(
      `[mastodon] recovered username "${username}" for ${account.mastodonInstance.instance} (was empty)`
    );
    return username;
  } catch {
    return null;
  }
};

export const getLinksFromMastodon = async (
  userId: string,
  opts?: { ignoreCursor?: boolean; skipListNames?: string[] },
): Promise<PushShareBatch | null> => {
  const account = await db.query.mastodonAccount.findFirst({
    where: eq(mastodonAccount.userId, userId),
    with: { mastodonInstance: true, lists: true },
  });
  if (!account) return null;

  const bskyAccount = await db.query.blueskyAccount.findFirst({
    where: eq(blueskyAccount.userId, userId),
  });

  // A Mastodon-only account with an empty username can't be keyed for the
  // AppView (its viewer is the actor URI, which needs the username). Recover it
  // from the live profile instead of silently skipping — this is what froze the
  // June-3 cohort. Dual-account users key off the Bluesky DID, so they don't
  // need this.
  let username = account.username?.trim() || null;
  if (!bskyAccount?.did && !username) {
    username = await recoverMastodonUsername(account);
  }

  const viewer =
    bskyAccount?.did ??
    (username
      ? mastodonActorUri(account.mastodonInstance.instance, username)
      : null);
  if (!viewer) return null;

  const hasCard = (t: mastodon.v1.Status): boolean =>
    !!t.card ||
    !!t.reblog?.card ||
    (isQuote(t.quote) && !!t.quote.quotedStatus?.card);

  const shares: PushShare[] = [];

  try {
    const timeline = await Promise.race([
      getMastodonTimeline(account, opts),
      new Promise<mastodon.v1.Status[]>((_, reject) =>
        setTimeout(() => reject(new Error("Timeline fetch timeout")), 90000),
      ),
    ]);
    const followsSource: PushShareSource = { kind: "follows" };
    for (const t of timeline) {
      if (!hasCard(t)) continue;
      const share = await processMastodonLink(t, followsSource);
      if (share) shares.push(share);
    }

    const subscribed = await isSubscribed(userId);
    if (subscribed !== "free") {
      const instance = account.mastodonInstance.instance;
      for (const list of account.lists) {
        // Skip slow feeds the caller opted out of (see getLinksFromBluesky).
        if (opts?.skipListNames?.includes(list.name)) continue;
        const listSource: PushShareSource = {
          kind: "mastodon-list",
          instance,
          id: list.uri, // Sill stores the Mastodon list id in `list.uri`
        };
        const listPosts = await Promise.race([
          getMastodonList(list.uri, account, opts),
          new Promise<mastodon.v1.Status[]>((_, reject) =>
            setTimeout(() => reject(new Error("List fetch timeout")), 60000),
          ),
        ]);
        for (const t of listPosts) {
          if (!hasCard(t)) continue;
          const share = await processMastodonLink(t, listSource);
          if (share) shares.push(share);
        }
      }
    }
  } catch (e) {
    console.error(
      "Error getting links from Mastodon:",
      e instanceof Error ? e.constructor.name : e,
      account.mastodonInstance.instance,
    );
  }

  return shares.length > 0 ? { viewer, shares } : null;
};

export const getMastodonLists = async (account: AccountWithInstance) => {
  const listOptions: ListOption[] = [];
  const client = createRestAPIClient({
    url: `https://${account.mastodonInstance.instance}`,
    accessToken: account.accessToken,
  });
  const lists = await client.v1.lists.list();
  for (const list of lists) {
    listOptions.push({
      name: list.title,
      uri: list.id,
      type: "mastodon",
      subscribed: account.lists.some((l) => l.uri === list.id),
    });
  }

  return listOptions;
};
