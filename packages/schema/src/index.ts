import { z } from "zod";

// Re-export database connection and migration functions
export { db, runMigrations, withAdvisoryLock } from "./db.js";

// Re-export all database schema
export * from "./schema.js";

// Re-export inferred types
import type {
  link,
  linkPostDenormalized,
  user,
  subscription,
  polarProduct,
  digestItem,
  digestRssFeed,
  digestSettings,
  notificationItem,
  notificationGroup,
  mutePhrase,
  termsUpdate,
  termsAgreement,
  bookmark,
  list,
  mastodonAccount,
  mastodonInstance,
  blueskyAccount,
  deviceToken,
  mobileTokenExchange,
} from "./schema.js";

// Database table types
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Link = typeof link.$inferSelect;
export type NewLink = typeof link.$inferInsert;

export type LinkPost = typeof linkPostDenormalized.$inferSelect;
export type NewLinkPost = typeof linkPostDenormalized.$inferInsert;

/**
 * The post a reply is replying to, resolved from a hydrated share's `parent`
 * and rendered above the reply as its own card. A subset of `LinkPost` — the
 * author line + body, plus the `quoted*` fields since a parent can itself be a
 * quote post (the share's `parent.subject`).
 */
export type RenderedParentPost = Pick<
  LinkPost,
  | "actorUrl"
  | "actorName"
  | "actorHandle"
  | "actorAvatarUrl"
  | "postUrl"
  | "postDate"
  | "postText"
  | "postType"
  | "postImages"
  | "quotedActorUrl"
  | "quotedActorName"
  | "quotedActorHandle"
  | "quotedActorAvatarUrl"
  | "quotedPostUrl"
  | "quotedPostText"
  | "quotedPostDate"
  | "quotedPostType"
  | "quotedPostImages"
>;

/**
 * A `LinkPost` as rendered from a hydrated AppView share. These are render-time
 * annotations from the share, not `link_post_denormalized` columns:
 * - `sources`: canonical source attribution (`"follows"`, a Bluesky feed/list
 *   at-URI, or `mastodon-list://…`) — which feed/list/follow surfaced the share,
 *   for the per-share source badge.
 * - `collection`: the share's atproto collection NSID (e.g. `app.bsky.feed.post`,
 *   `mastodon.status`, `network.cosmik.card`, `site.standard.document`) — drives
 *   the source logo without sniffing the post body.
 * - `parent`: when the share is a reply, the post it replies to (shown above).
 */
export type RenderedLinkPost = LinkPost & {
  sources?: string[] | null;
  collection?: string | null;
  parent?: RenderedParentPost | null;
};

export type Subscription = typeof subscription.$inferSelect;
export type NewSubscription = typeof subscription.$inferInsert;

export type PolarProduct = typeof polarProduct.$inferSelect;
export type NewPolarProduct = typeof polarProduct.$inferInsert;

export type DigestItem = typeof digestItem.$inferSelect;
export type NewDigestItem = typeof digestItem.$inferInsert;

export type DigestRssFeed = typeof digestRssFeed.$inferSelect;
export type NewDigestRssFeed = typeof digestRssFeed.$inferInsert;

export type DigestSettings = typeof digestSettings.$inferSelect;
export type NewDigestSettings = typeof digestSettings.$inferInsert;

export type NotificationItem = typeof notificationItem.$inferSelect;
export type NewNotificationItem = typeof notificationItem.$inferInsert;

export type NotificationGroup = typeof notificationGroup.$inferSelect;
export type NewNotificationGroup = typeof notificationGroup.$inferInsert;

export type MutedPhrase = typeof mutePhrase.$inferSelect;
export type NewMutedPhrase = typeof mutePhrase.$inferInsert;

export type TermsUpdate = typeof termsUpdate.$inferSelect;
export type NewTermsUpdate = typeof termsUpdate.$inferInsert;

export type TermsAgreement = typeof termsAgreement.$inferSelect;
export type NewTermsAgreement = typeof termsAgreement.$inferInsert;

export type Bookmark = typeof bookmark.$inferSelect;
export type NewBookmark = typeof bookmark.$inferInsert;

export type List = typeof list.$inferSelect;
export type NewList = typeof list.$inferInsert;

export type MastodonAccount = typeof mastodonAccount.$inferSelect;
export type NewMastodonAccount = typeof mastodonAccount.$inferInsert;

export type MastodonInstance = typeof mastodonInstance.$inferSelect;
export type NewMastodonInstance = typeof mastodonInstance.$inferInsert;

export type BlueskyAccount = typeof blueskyAccount.$inferSelect;
export type NewBlueskyAccount = typeof blueskyAccount.$inferInsert;

export type DeviceToken = typeof deviceToken.$inferSelect;
export type NewDeviceToken = typeof deviceToken.$inferInsert;

export type MobileTokenExchange = typeof mobileTokenExchange.$inferSelect;
export type NewMobileTokenExchange = typeof mobileTokenExchange.$inferInsert;

// Composite types
export interface MostRecentLinkPosts {
  uniqueActorsCount: number;
  link: Link | null;
  posts?: RenderedLinkPost[];
  // Up to a few sharer avatar URLs for a face-pile preview. Lets the list
  // render "shared by" without hydrating every post upfront; posts are loaded
  // on demand when a card is expanded.
  avatars?: string[];
}

export interface NotificationQuery {
  category: {
    id: string;
    name: string;
    type: string;
    values?: {
      id: string;
      name: string;
    }[];
  };
  operator: string;
  value: string | number;
}

export interface ListOption {
  name: string;
  uri: string;
  type: "bluesky" | "mastodon";
  subscribed: boolean;
}

export type SubscriptionStatus = "free" | "trial" | "plus";

export interface AccountWithInstance extends MastodonAccount {
  mastodonInstance: MastodonInstance;
  lists: List[];
}
export const codeQueryParam = "code";
export const targetQueryParam = "target";
export const typeQueryParam = "type";
export const redirectToQueryParam = "redirectTo";

const types = [
  "onboarding",
  "reset-password",
  "change-email",
  "2fa",
  "add-email",
] as const;
export const VerificationTypeSchema = z.enum(types);
export type VerificationTypes = z.infer<typeof VerificationTypeSchema>;
