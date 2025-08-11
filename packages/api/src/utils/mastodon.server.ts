import { and, eq } from "drizzle-orm";
import { createRestAPIClient, type mastodon } from "masto";
import { isSubscribed } from "src/auth/auth.server";
import {
  db,
  list,
  mastodonAccount,
  postType,
  type AccountWithInstance,
  type ListOption,
} from "@sill/schema";
import { uuidv7 } from "uuidv7-js";
import type { ProcessedResult } from "./links.server";
import {
  getFullUrl,
  isGiftLink,
  isShortenedLink,
  normalizeLink,
} from "./normalizeLink";

const REDIRECT_URI = process.env.MASTODON_REDIRECT_URI as string;
const ONE_DAY_MS = 86400000; // 24 hours in milliseconds

/**
 * Constructs the authorization URL for a given Mastodon instance
 * @param instance Mastodon instance URL
 * @returns Authorization URL for the Mastodon instance
 */
export const getAuthorizationUrl = (instance: string, clientId: string) => {
  return `https://${instance}/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&instance=${encodeURIComponent(instance)}`;
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
  }
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
  for await (const statuses of client.v1.timelines.list.$select(listUri).list({
    sinceId: dbList.mostRecentPostId,
    limit: 40,
  })) {
    if (ended) break;
    for await (const status of statuses) {
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
  }
): Promise<mastodon.v1.Status[]> => {
  const yesterday = new Date(Date.now() - 10800000);

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
  for await (const statuses of client.v1.timelines.home.list({
    sinceId: account.mostRecentPostId,
    limit: 40,
  })) {
    if (ended) break;
    for await (const status of statuses) {
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

/**
 * Processes a post from Mastodon timeline to detect links and prepares data for database insertion
 * @param userId ID for logged in user
 * @param t Status object from Mastodon timeline
 * @returns Actors, post, link, and new link post to insert into database
 */
const processMastodonLink = async (
  userId: string,
  t: mastodon.v1.Status,
  listId?: string
) => {
  const original = t.reblog || t;
  const url = original.url;
  const card = original.card;

  if (!url || !card) {
    return null;
  }

  if (card.url === "https://www.youtube.com/undefined") {
    const youtubeUrl = await getYoutubeUrl(original.content);
    if (youtubeUrl) {
      card.url = youtubeUrl;
    }
  }

  if (card.url.includes(".gif")) {
    return null;
  }

  if (await isShortenedLink(card.url)) {
    card.url = await getFullUrl(card.url);
  }

  const link = {
    id: uuidv7(),
    url: await normalizeLink(card.url),
    title: card.title,
    description: card.description,
    imageUrl: card.image,
    giftUrl: (await isGiftLink(card.url)) ? card.url : undefined,
  };

  const denormalized = {
    id: uuidv7(),
    linkUrl: link.url,
    postText: original.content,
    postDate: new Date(original.createdAt),
    postType: postType.enumValues[1],
    postUrl: url,
    actorHandle: original.account.acct,
    actorName: original.account.displayName,
    actorUrl: original.account.url,
    actorAvatarUrl: original.account.avatar,
    repostActorHandle: t.reblog ? t.account.acct : undefined,
    repostActorName: t.reblog ? t.account.displayName : undefined,
    repostActorUrl: t.reblog ? t.account.url : undefined,
    repostActorAvatarUrl: t.reblog ? t.account.avatar : undefined,
    userId,
    listId,
  };

  return {
    link,
    denormalized,
  };
};

/**
 * Gets Mastodon timeline and processes posts
 * @param userId ID for logged in user
 * @returns Processed results for database insertion
 */
export const getLinksFromMastodon = async (
  userId: string
): Promise<ProcessedResult[]> => {
  const account = await db.query.mastodonAccount.findFirst({
    where: eq(mastodonAccount.userId, userId),
    with: {
      mastodonInstance: true,
      lists: true,
    },
  });

  if (!account) return [];

  try {
    const timelinePromise = getMastodonTimeline(account);

    const timeline = await Promise.race([
      timelinePromise,
      new Promise<mastodon.v1.Status[]>((_, reject) =>
        setTimeout(() => reject(new Error("Timeline fetch timeout")), 90000)
      ),
    ]);

    const linksOnly = timeline.filter((t) => t.card || t.reblog?.card);
    const processedResults = (
      await Promise.all(
        linksOnly.map(async (t) => processMastodonLink(userId, t))
      )
    ).filter((p) => p !== null);

    const subscribed = await isSubscribed(userId);
    if (subscribed !== "free") {
      for (const list of account.lists) {
        const listPosts = await Promise.race([
          getMastodonList(list.uri, account),
          new Promise<mastodon.v1.Status[]>((_, reject) =>
            setTimeout(() => reject(new Error("List fetch timeout")), 60000)
          ),
        ]);

        const linksOnly = listPosts.filter((t) => t.card || t.reblog?.card);
        processedResults.push(
          ...(
            await Promise.all(
              linksOnly.map(async (t) =>
                processMastodonLink(userId, t, list.id)
              )
            )
          ).filter((p) => p !== null)
        );
      }
    }

    return processedResults;
  } catch (e) {
    console.error(
      "Error getting links from Mastodon:",
      e?.constructor?.name,
      account.mastodonInstance.instance
    );
    return [];
  }
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
