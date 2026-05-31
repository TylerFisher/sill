import {
  Agent,
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AppBskyRichtextFacet,
  RichText,
} from "@atproto/api";
import type { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import {
  OAuthCallbackError,
  OAuthResponseError,
  type OAuthSession,
  TokenRefreshError,
} from "@atproto/oauth-client-node";
import { and, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7-js";
import { type AuthVariant, isSubscribed } from "@sill/auth";
import {
  db,
  blueskyAccount,
  blueskyMutedWord,
  list,
  mutePhrase,
  postType,
  user,
  type ListOption,
} from "@sill/schema";
import {
  postViewerPreferences,
  type PushShare,
  type PushShareBatch,
  type PushShareSource,
} from "./appview.js";
import { createOAuthClient } from "@sill/auth";
import { sendBlueskyAuthErrorEmail } from "@sill/emails";
import {
  recordCacheHit,
  recordCacheMiss,
  recordCacheError,
} from "./cache-report.js";

interface BskyDetectedLink {
  uri: string;
  title: string | null;
  description: string | null;
  imageUrl?: string | null;
}

/** Defensive clip for actor.handle (AppView rejects > 512 chars). */
const HANDLE_MAX = 512;
const clipHandle = (h: string | null | undefined): string | null => {
  if (!h) return null;
  return h.length > HANDLE_MAX ? h.slice(0, HANDLE_MAX) : h;
};

export const ONE_DAY_MS = 86400000; // 24 hours in milliseconds

/**
 * OAuth session cache to prevent duplicate restore attempts within a single operation.
 * Keyed by `${did}::${authVariant}` so that when an account migrates from v1 to v2
 * the worker's next tick misses cache and fetches a fresh session via the right client.
 */
interface OAuthSessionCacheEntry {
  session: OAuthSession | null;
  expiresAt: Date | undefined;
}

const oauthSessionCache = new Map<string, OAuthSessionCacheEntry>();

/**
 * Agent cache to reuse the same Agent instance for all calls within a single job.
 * Same keying as oauthSessionCache — `${did}::${authVariant}`.
 */
interface AgentCacheEntry {
  agent: Agent;
  expiresAt: Date | undefined;
}

const agentCache = new Map<string, AgentCacheEntry>();

type BlueskyAccountForAuth = {
  did: string;
  handle: string;
  userId?: string;
  authErrorNotificationSent?: boolean;
  authVariant?: string;
};

const cacheKey = (account: BlueskyAccountForAuth): string =>
  `${account.did}::${(account.authVariant ?? "v1") as AuthVariant}`;

/**
 * Restores Bluesky OAuth session based on account did.
 * Handles OAuthResponseError (for DPoP nonce) by attempting to restore session again.
 * Uses caching to prevent duplicate restore attempts within a short time window.
 * Sends email notification to user if authentication fails (only once until re-auth succeeds).
 * @param account Account object with did, handle, userId, authErrorNotificationSent, and authVariant
 * @returns Bluesky OAuth session
 */
export const handleBlueskyOAuth = async (account: BlueskyAccountForAuth) => {
  const variant = (account.authVariant ?? "v1") as AuthVariant;
  const key = cacheKey(account);

  // Check cache first — reuse if token hasn't expired
  const cached = oauthSessionCache.get(key);
  if (
    cached &&
    (!cached.expiresAt || cached.expiresAt.getTime() > Date.now())
  ) {
    return cached.session;
  }

  let oauthSession: OAuthSession | null = null;
  let expiresAt: Date | undefined;
  let shouldSendEmail = false;

  try {
    const client = await createOAuthClient(variant);
    oauthSession = await client.restore(account.did);
    expiresAt = (await oauthSession.getTokenInfo()).expiresAt;
  } catch (error) {
    if (error instanceof OAuthResponseError) {
      const client = await createOAuthClient(variant);
      oauthSession = await client.restore(account.did);
    } else if (
      error instanceof TokenRefreshError ||
      (error instanceof Error && error.constructor.name === "TokenRefreshError")
    ) {
      console.error(`Token refresh error for ${account.handle}`);
      shouldSendEmail = true;
    } else if (error instanceof OAuthCallbackError) {
      // Check if this is an issuer mismatch error by examining the error message
      if (error.message === "Issuer mismatch") {
        console.error(`Issuer mismatch error for ${account.handle}`);
        shouldSendEmail = true;
      } else {
        console.error(
          `OAuth callback error for ${account.handle}: ${error.message}`,
        );
      }
    } else {
      console.error(
        `Error restoring OAuth session for ${account.handle}`,
        error,
      );
    }
  }

  // Send email notification if auth failed and we haven't sent one yet
  // if (shouldSendEmail && account.userId && !account.authErrorNotificationSent) {
  //   try {
  //     // Get user email
  //     const userRecord = await db.query.user.findFirst({
  //       where: eq(user.id, account.userId),
  //     });

  //     if (userRecord?.email) {
  //       const settingsUrl = "https://sill.social/settings?tab=connect";
  //       await sendBlueskyAuthErrorEmail({
  //         to: userRecord.email,
  //         handle: account.handle,
  //         settingsUrl,
  //       });

  //       // Update the flag to prevent duplicate emails
  //       await db
  //         .update(blueskyAccount)
  //         .set({ authErrorNotificationSent: true })
  //         .where(eq(blueskyAccount.did, account.did));

  //       console.log(
  //         `Sent auth error email to ${userRecord.email} for ${account.handle}`
  //       );
  //     }
  //   } catch (emailError) {
  //     console.error(
  //       `Failed to send auth error email for ${account.handle}:`,
  //       emailError
  //     );
  //   }
  // }

  // Only cache successful sessions — failed restores may be transient
  if (oauthSession) {
    oauthSessionCache.set(key, {
      session: oauthSession,
      expiresAt,
    });
  }

  return oauthSession;
};

/**
 * Clears the OAuth session cache and agent cache for a specific account or all accounts.
 * Prefix-scans because cache keys are `${did}::${authVariant}` — a single DID may
 * have stale v1 and v2 entries during the migration window.
 */
export const clearOAuthSessionCache = (did?: string) => {
  if (did) {
    const prefix = `${did}::`;
    for (const key of oauthSessionCache.keys()) {
      if (key.startsWith(prefix)) oauthSessionCache.delete(key);
    }
    for (const key of agentCache.keys()) {
      if (key.startsWith(prefix)) agentCache.delete(key);
    }
  } else {
    oauthSessionCache.clear();
    agentCache.clear();
  }
};

/**
 * Gets or creates a reusable Agent for a Bluesky account.
 * Reuses the same Agent instance across all calls for the same account within a job.
 * @param account Account object with did, handle, userId, and authErrorNotificationSent flag
 * @returns Agent instance or null if OAuth fails
 */
export const getOrCreateAgent = async (
  account: BlueskyAccountForAuth,
): Promise<Agent | null> => {
  const key = cacheKey(account);
  const cached = agentCache.get(key);
  if (
    cached &&
    (!cached.expiresAt || cached.expiresAt.getTime() > Date.now())
  ) {
    recordCacheHit(account.handle);
    return cached.agent;
  }

  const oauthSession = await handleBlueskyOAuth(account);
  if (!oauthSession) {
    recordCacheError(account.handle);
    return null;
  }

  recordCacheMiss(account.handle);
  const expiresAt = (await oauthSession.getTokenInfo()).expiresAt;
  const agent = new Agent(oauthSession);
  agentCache.set(key, { agent, expiresAt });
  return agent;
};

export const getBlueskyList = async (
  agent: Agent,
  dbList: typeof list.$inferSelect,
  accountHandle: string,
) => {
  async function getList(cursor: string | undefined = undefined) {
    // biome-ignore lint/suspicious/noImplicitAnyLet:
    let response;
    if (dbList.uri.includes("app.bsky.graph.list")) {
      response = await agent.app.bsky.feed.getListFeed({
        list: dbList.uri,
        limit: 100,
        cursor,
      });
    } else if (dbList.uri.includes("app.bsky.feed.generator")) {
      response = await agent.app.bsky.feed.getFeed({
        feed: dbList.uri,
        limit: 100,
        cursor,
      });
    }

    if (!response) {
      return [];
    }

    const list = response.data.feed;
    const checkDate = dbList.mostRecentPostDate
      ? new Date(
          `${dbList.mostRecentPostDate.replace(" ", "T")}Z`,
        ).toISOString()
      : new Date(Date.now() - ONE_DAY_MS).toISOString();

    let reachedEnd = false;
    const newPosts: AppBskyFeedDefs.FeedViewPost[] = [];
    for (const [index, item] of list.entries()) {
      if (item.post.author.handle === accountHandle) continue;
      if (
        AppBskyFeedDefs.isReasonRepost(item.reason) &&
        item.reason.by.handle === accountHandle
      )
        continue;

      const postDate = AppBskyFeedDefs.isReasonRepost(item.reason)
        ? new Date(item.reason.indexedAt).toISOString()
        : new Date(item.post.indexedAt).toISOString();

      // skip a few posts in case of pinned posts
      if (postDate <= checkDate && index > 5) {
        reachedEnd = true;
        break;
      }
      newPosts.push(item);
    }

    if (!reachedEnd && response.data.cursor) {
      const nextPosts = await getList(response.data.cursor);
      newPosts.push(...nextPosts);
    }
    return newPosts;
  }

  try {
    const listTimeline = await getList();
    if (listTimeline.length > 0) {
      // let firstPost = listTimeline[0];
      // let date = AppBskyFeedDefs.isReasonRepost(firstPost.reason)
      // 	? new Date(firstPost.reason.indexedAt)
      // 	: new Date(firstPost.post.indexedAt);

      // // Find first post that's within last 24 hours
      // let i = 0;
      // while (
      // 	i < listTimeline.length &&
      // 	Date.now() - date.getTime() > ONE_DAY_MS
      // ) {
      // 	i++;
      // 	if (i < listTimeline.length) {
      // 		firstPost = listTimeline[i];
      // 		date = AppBskyFeedDefs.isReasonRepost(firstPost.reason)
      // 			? new Date(firstPost.reason.indexedAt)
      // 			: new Date(firstPost.post.indexedAt);
      // 	}
      // }

      await db
        .update(list)
        .set({
          mostRecentPostDate: new Date().toISOString(),
        })
        .where(eq(list.uri, dbList.uri));
    }
    return listTimeline;
  } catch (e) {
    console.error(
      `Error fetching Bluesky list ${dbList.name}, ${dbList.uri} for ${accountHandle}`,
      e?.constructor?.name,
    );
    return [];
  }
};

/**
 * Constructs a full URL for a Bluesky post
 * @param authorHandle Handle of the author of the post
 * @param postUri Full AT URI of the post
 * @returns Full URL for the post
 */
const getPostUrl = async (authorHandle: string, postUri: string) => {
  return `https://bsky.app/profile/${authorHandle}/post/${postUri
    .split("/")
    .at(-1)}`;
};

/**
 * Handles embeds in a Bluesky post
 * @param embed Embed object from Bluesky post
 * @returns Quoted post, external link, and image group data
 */
const handleEmbeds = async (embed: PostView["embed"]) => {
  let quoted: AppBskyEmbedRecord.View | null = null;
  let quotedRecord: AppBskyEmbedRecord.ViewRecord | null = null;
  let quotedValue: AppBskyFeedPost.Record | null = null;
  let externalRecord: AppBskyEmbedExternal.View | null = null;
  let quotedImageGroup: AppBskyEmbedImages.ViewImage[] = [];
  let detectedLink: BskyDetectedLink | null = null;
  let quotedPostUrl: string | null = null;
  let imageGroup: AppBskyEmbedImages.ViewImage[] = [];

  if (AppBskyEmbedRecord.isView(embed)) {
    quoted = embed;
  } else if (AppBskyEmbedRecordWithMedia.isView(embed)) {
    if (AppBskyEmbedRecord.isView(embed.record)) {
      quoted = embed.record;
    }
    if (AppBskyEmbedExternal.isView(embed.media)) {
      externalRecord = embed.media;
    }
    if (AppBskyEmbedImages.isView(embed.media)) {
      imageGroup = embed.media.images;
    }
  }
  if (quoted && AppBskyEmbedRecord.isView(quoted)) {
    if (AppBskyEmbedRecord.isViewRecord(quoted.record)) {
      quotedRecord = quoted.record;
      quotedPostUrl = await getPostUrl(
        quotedRecord.author.handle,
        quotedRecord.uri,
      );
      const embeddedLink = quotedRecord.embeds?.find((e) =>
        AppBskyEmbedExternal.isView(e),
      );
      if (embeddedLink) {
        externalRecord = embeddedLink;
      }
      const imageGroup = quotedRecord?.embeds?.find((embed) =>
        AppBskyEmbedImages.isView(embed),
      );
      if (imageGroup) {
        quotedImageGroup = imageGroup.images;
      }
      const quotedRecordWithMedia = quotedRecord?.embeds?.find((embed) =>
        AppBskyEmbedRecordWithMedia.isView(embed),
      );
      if (quotedRecordWithMedia) {
        if (AppBskyEmbedImages.isView(quotedRecordWithMedia.media)) {
          quotedImageGroup = quotedRecordWithMedia.media.images;
        }
        if (AppBskyEmbedExternal.isView(quotedRecordWithMedia.media)) {
          externalRecord = quotedRecordWithMedia.media;
        }
      }
      if (AppBskyFeedPost.isRecord(quoted.record.value)) {
        quotedValue = quoted.record.value as AppBskyFeedPost.Record;
        if (!externalRecord && quotedValue) {
          detectedLink = await findBlueskyLinkFacets(quotedValue);
        }
      }
    }
  }

  if (AppBskyEmbedExternal.isView(embed)) {
    externalRecord = embed;
  }
  if (AppBskyEmbedImages.isView(embed)) {
    imageGroup = embed.images;
  }

  return {
    quotedRecord,
    quotedValue,
    externalRecord,
    quotedImageGroup,
    detectedLink,
    quotedPostUrl,
    imageGroup,
  };
};

/**
 * Checks for an external record in a Bluesky post
 * If available, returns the external record
 * If not, searches for a link facet in the post record
 * @param record Record from Bluesky post
 * @param externalRecord External record from Bluesky post
 * @returns Detected link from Bluesky post
 */
const getDetectedLink = async (
  record: AppBskyFeedPost.Record,
  externalRecord: AppBskyEmbedExternal.View | null,
  initialDetectedLink: BskyDetectedLink | null = null,
) => {
  let detectedLink = initialDetectedLink;
  if (!externalRecord) {
    if (!detectedLink) {
      detectedLink = await findBlueskyLinkFacets(record);
    }
  } else {
    detectedLink = {
      uri: externalRecord.external.uri,
      title: await handleLinkTitle(externalRecord.external.title),
      description: externalRecord.external.description,
      imageUrl: externalRecord.external.thumb,
    };
  }
  return detectedLink;
};

const handleLinkTitle = async (title: string) => {
  if (title === "Main link in OG tweet") {
    return "";
  }
  return title;
};

/**
 * Build the `/v1/shares` payload for one Bluesky list/feed entry. Returns null
 * when the entry has no link, links to a gif, or fails to parse. URL is
 * normalised (shortener expansion, gift link detection is a no-op here — the
 * AppView re-canonicalises). The legacy DB-shaped `{ link, denormalized }`
 * tuple is gone: the worker now pushes shares to the AppView instead of
 * writing them to `linkPostDenormalized`.
 */
export const processBlueskyLink = async (
  t: AppBskyFeedDefs.FeedViewPost,
  source: PushShareSource,
): Promise<PushShare | null> => {
  if (!AppBskyFeedPost.isRecord(t.post.record)) return null;
  const record = t.post.record as AppBskyFeedPost.Record;

  const {
    quotedRecord,
    quotedValue,
    quotedPostUrl,
    externalRecord,
    detectedLink: initialDetectedLink,
  } = await handleEmbeds(t.post.embed);

  const detectedLink = await getDetectedLink(
    record,
    externalRecord,
    initialDetectedLink,
  );
  if (!detectedLink) return null;
  if (detectedLink.uri.includes(".gif")) return null;
  // The AppView canonicalises URLs (shortener expansion, tracking-param strip,
  // case-folding host, etc.) on receipt — we pass the raw URI through.
  const url = detectedLink.uri;

  // Defensive: actor.id must be a non-empty string. Bluesky DIDs always are,
  // but guard rather than send a broken share.
  if (!t.post.author.did) return null;

  const share: PushShare = {
    url,
    network: "bsky",
    source,
    post: {
      // at:// URI per API.md (Bluesky side uses the atproto-native ref).
      uri: t.post.uri,
      text: record.text,
      createdAt: record.createdAt,
    },
    actor: {
      id: t.post.author.did,
      handle: clipHandle(t.post.author.handle),
      displayName: t.post.author.displayName ?? null,
      avatarUrl: t.post.author.avatar ?? null,
    },
  };

  if (AppBskyFeedDefs.isReasonRepost(t.reason) && t.reason.by.did) {
    share.repost = {
      actor: {
        id: t.reason.by.did,
        handle: clipHandle(t.reason.by.handle),
        displayName: t.reason.by.displayName ?? null,
        avatarUrl: t.reason.by.avatar ?? null,
      },
      createdAt: t.reason.indexedAt,
    };
  }

  if (
    quotedRecord &&
    quotedValue &&
    quotedRecord.author.did &&
    quotedRecord.uri
  ) {
    share.quoted = {
      actor: {
        id: quotedRecord.author.did,
        handle: clipHandle(quotedRecord.author.handle),
        displayName: quotedRecord.author.displayName ?? null,
        avatarUrl: quotedRecord.author.avatar ?? null,
      },
      post: {
        uri: quotedRecord.uri,
        text: quotedValue.text ?? "",
        createdAt: quotedValue.createdAt,
      },
    };
  }

  return share;
};

/**
 * Collect observed Bluesky-list/feed shares for a viewer. Returns a single
 * `{viewer, shares}` batch ready to feed into `pushShareBatches`, or null
 * when nothing was observed. The caller (worker batch or one-off API route)
 * decides when to flush.
 *
 * The Bluesky following timeline is NOT touched here — the AppView ingests
 * that from the Jetstream firehose directly.
 */
export const getLinksFromBluesky = async (
  userId: string,
): Promise<PushShareBatch | null> => {
  const account = await db.query.blueskyAccount.findFirst({
    where: eq(blueskyAccount.userId, userId),
    with: { lists: true },
  });
  if (!account) return null;

  const agent = await getOrCreateAgent(account);
  if (!agent) return null;

  const subscribed = await isSubscribed(userId);
  if (subscribed === "free") return null;

  const shares: PushShare[] = [];
  for (const list of account.lists) {
    // The AppView canonicalises both `app.bsky.graph.list` and
    // `app.bsky.feed.generator` at-URIs to the same `at-uri` source kind —
    // pass the at-URI verbatim.
    const source: PushShareSource = { kind: "at-uri", uri: list.uri };
    const listPosts = await Promise.race([
      getBlueskyList(agent, list, account.handle),
      new Promise<AppBskyFeedDefs.FeedViewPost[]>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `List timeout: ${list.name}, ${list.uri} for ${account.handle}`,
              ),
            ),
          120000,
        ),
      ),
    ]).catch((e) => {
      console.error("Error fetching list:", list.name, e?.constructor?.name);
      return [];
    });
    for (const t of listPosts) {
      const share = await processBlueskyLink(t, source);
      if (share) shares.push(share);
    }
  }

  return shares.length > 0 ? { viewer: account.did, shares } : null;
};

/**
 * Find the first non-bsky.app link facet in a Bluesky post record. Returns
 * the raw URI; the AppView canonicalises on receipt, so no normalisation or
 * metadata lookup is done here.
 */
const findBlueskyLinkFacets = async (
  record: AppBskyFeedPost.Record,
): Promise<BskyDetectedLink | null> => {
  const rt = new RichText({
    text: record.text,
    facets: record.facets,
  });
  for await (const segment of rt.segments()) {
    if (
      segment.link &&
      AppBskyRichtextFacet.validateLink(segment.link).success &&
      !segment.link.uri.includes("bsky.app")
    ) {
      return {
        uri: segment.link.uri,
        title: "",
        imageUrl: null,
        description: null,
      };
    }
  }
  return null;
};

type BlueskyAccount = typeof blueskyAccount.$inferSelect;
interface AccountWithLists extends BlueskyAccount {
  lists: (typeof list.$inferSelect)[];
}

/**
 * Sync the account's Bluesky muted words (app.bsky.actor.getPreferences
 * `mutedWordsPref`) into the `bluesky_muted_word` table. Replaces the stored
 * set each time so removals are reflected. This is the user's own Bluesky
 * mutes — separate from Sill's `mute_phrase`. Best-effort: never throws, so
 * callers can fire-and-forget.
 */
export const syncBlueskyMutedWords = async (
  agent: Agent,
  blueskyAccountId: string,
): Promise<void> => {
  try {
    const prefs = await agent.getPreferences();
    // Ignore "exclude-following" mutes: they apply to everyone EXCEPT accounts
    // the user follows, and Sill only ever surfaces the following graph, so they
    // would never match. Keep "all" (and any other target), which do apply.
    const words = (prefs.moderationPrefs?.mutedWords ?? []).filter(
      (w) => w.actorTarget !== "exclude-following",
    );
    await db.transaction(async (tx) => {
      await tx
        .delete(blueskyMutedWord)
        .where(eq(blueskyMutedWord.blueskyAccountId, blueskyAccountId));
      if (words.length === 0) return;
      await tx.insert(blueskyMutedWord).values(
        words.map((w) => ({
          id: uuidv7(),
          blueskyAccountId,
          bskyId: w.id ?? null,
          value: w.value,
          targets: w.targets ?? [],
          actorTarget: w.actorTarget || "all",
          expiresAt: w.expiresAt ?? null,
        })),
      );
    });
  } catch (e) {
    console.error(
      "Failed to sync Bluesky muted words:",
      blueskyAccountId,
      e instanceof Error ? e.message : e,
    );
  }
};

/** Page through `app.bsky.graph.getMutes` and return all muted account DIDs. */
const fetchBlueskyMutedDids = async (
  agent: Agent,
): Promise<string[] | undefined> => {
  try {
    const dids: string[] = [];
    let cursor: string | undefined;
    // Safety cap: 50 pages × 100 = 5000 (matches the AppView's mutedDids cap).
    for (let page = 0; page < 50; page++) {
      const res = await agent.app.bsky.graph.getMutes({ limit: 100, cursor });
      for (const a of res.data.mutes) dids.push(a.did);
      cursor = res.data.cursor;
      if (!cursor || res.data.mutes.length === 0) break;
    }
    return dids;
  } catch (e) {
    // Returning undefined leaves the AppView's stored mutedDids untouched.
    console.error(
      "Failed to fetch Bluesky muted DIDs:",
      e instanceof Error ? e.message : e,
    );
    return undefined;
  }
};

/**
 * Push the viewer's preferences to the AppView (`POST /v1/preferences`) — the
 * combined mute words (Sill `mute_phrase` ∪ Bluesky `bluesky_muted_word`),
 * plus an optional muted-DIDs list when caller supplies one (omitted leaves
 * the AppView's stored DIDs untouched, per the per-field LWW semantics).
 * Reads words from the DB so it reflects whatever was last synced. Best-effort.
 */
const pushCombinedPreferences = async (
  account: { id: string; userId: string; did: string },
  opts: { mutedDids?: string[] } = {},
): Promise<void> => {
  try {
    const [sillMutes, bskyMutes] = await Promise.all([
      db
        .select({ phrase: mutePhrase.phrase })
        .from(mutePhrase)
        .where(
          and(
            eq(mutePhrase.userId, account.userId),
            eq(mutePhrase.active, true),
          ),
        ),
      db
        .select({ value: blueskyMutedWord.value })
        .from(blueskyMutedWord)
        .where(eq(blueskyMutedWord.blueskyAccountId, account.id)),
    ]);
    await postViewerPreferences(account.did, {
      mutedWords: [
        ...sillMutes.map((m) => m.phrase),
        ...bskyMutes.map((m) => m.value),
      ],
      mutedDids: opts.mutedDids,
    });
  } catch (e) {
    console.error("Failed to push combined preferences to AppView:", e);
  }
};

/**
 * Sync the account's mutes end-to-end: store the user's Bluesky muted words in
 * the DB (from `getPreferences`), fetch their muted accounts (from `getMutes`),
 * and push the combined preferences (Sill+Bluesky words, Bluesky DIDs) to the
 * AppView. Best-effort throughout, so safe to fire-and-forget at signup/status.
 */
export const syncMutes = async (
  agent: Agent,
  account: { id: string; userId: string; did: string },
): Promise<void> => {
  await syncBlueskyMutedWords(agent, account.id);
  const mutedDids = await fetchBlueskyMutedDids(agent);
  await pushCombinedPreferences(account, { mutedDids });
};

/**
 * Re-push a user's combined mute list to the AppView after they change their
 * own Sill mutes (`mute_phrase`). Looks up their Bluesky account for the viewer
 * DID; no-op if they have none. Sends only `mutedWords` — `mutedDids` is left
 * alone (Sill mute changes don't affect Bluesky muted accounts). Best-effort.
 */
export const syncUserMutesToAppView = async (
  userId: string,
): Promise<void> => {
  const account = await db.query.blueskyAccount.findFirst({
    where: eq(blueskyAccount.userId, userId),
  });
  if (!account) return;
  await pushCombinedPreferences({
    id: account.id,
    userId,
    did: account.did,
  });
};

export const getBlueskyLists = async (account: AccountWithLists) => {
  const listOptions: ListOption[] = [];
  const agent = await getOrCreateAgent(account);
  if (!agent) return listOptions;
  const prefs = await agent.getPreferences();
  const lists = prefs.savedFeeds;
  for (const list of lists) {
    if (list.type === "list") {
      try {
        const listData = await agent.app.bsky.graph.getList({
          list: list.value,
        });
        listOptions.push({
          name: listData.data.list.name,
          uri: listData.data.list.uri,
          type: "bluesky",
          subscribed: account.lists.some(
            (l) => l.uri === listData.data.list.uri,
          ),
        });
      } catch (error) {
        console.error("Could not find list", list.value, error);
      }
    } else if (list.type === "feed") {
      try {
        const feedData = await agent.app.bsky.feed.getFeedGenerator({
          feed: list.value,
        });
        listOptions.push({
          name: feedData.data.view.displayName,
          uri: feedData.data.view.uri,
          type: "bluesky",
          subscribed: account.lists.some(
            (l) => l.uri === feedData.data.view.uri,
          ),
        });
      } catch (error) {
        console.error("Could not find feed", list.value, error);
      }
    }
  }

  return listOptions;
};
