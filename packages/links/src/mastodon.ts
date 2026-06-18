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
  for await (const statuses of client.v1.timelines.list.$select(listUri).list({
    sinceId: opts?.ignoreCursor ? undefined : dbList.mostRecentPostId,
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
      if (status.account.username === profile.username) continue;
      if (status.reblog?.account.username === profile.username) continue;

      // Don't use flipboard or reposts as yesterday check
      if (
        new Date(status.createdAt) <= yesterday &&
        status.account.acct.split("@")[1] !== "flipboard.com" &&
        !status.reblog
      ) {
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

  if (timeline.length > 0) {
    await db
      .update(list)
      .set({
        mostRecentPostId: timeline[0].id,
      })
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

  // Only pass sinceId if it's set - otherwise fetch all recent posts
  const listParams: { limit: number; sinceId?: string } = { limit: 40 };
  if (!opts?.ignoreCursor && account.mostRecentPostId) {
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
      if (status.account.username === profile.username) continue;
      if (status.reblog?.account.username === profile.username) continue;

      // Don't use flipboard or reposts as yesterday check
      if (
        new Date(status.createdAt) <= yesterday &&
        status.account.acct.split("@")[1] !== "flipboard.com" &&
        !status.reblog
      ) {
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

  if (timeline.length > 0) {
    await db
      .update(mastodonAccount)
      .set({
        mostRecentPostId: timeline[0].id,
      })
      .where(eq(mastodonAccount.id, account.id));
  }

  return timeline;
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
  const viewer =
    bskyAccount?.did ??
    (account.username
      ? mastodonActorUri(account.mastodonInstance.instance, account.username)
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
