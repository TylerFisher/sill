import { eq } from "drizzle-orm";
import { blueskyAccount, db, mastodonAccount } from "@sill/schema";

/**
 * The ActivityPub actor URI for a Mastodon account (e.g.
 * `https://mastodon.social/users/alice`). The AppView accepts this as a `viewer`
 * key, the same way it accepts a Bluesky DID.
 */
export const mastodonActorUri = (
  instance: string,
  username: string,
): string => `https://${instance}/users/${username}`;

/**
 * Resolve the AppView `viewer` key for a Sill user. The AppView identifies a
 * viewer by a single string: a Bluesky DID, or a Mastodon ActivityPub actor URI.
 *
 * Rule: prefer the Bluesky DID; fall back to the Mastodon actor URI for
 * Mastodon-only users. This prefer-DID rule is mirrored on read and write, so a
 * dual-account user's Mastodon shares (keyed under their DID at ingest) and
 * their reads both stay under one key. The actor URI only applies when there is
 * no Bluesky account.
 *
 * Returns null when the user has neither a Bluesky account nor a usable Mastodon
 * identity (no stored username/instance).
 */
export const resolveViewer = async (
  userId: string,
): Promise<string | null> => {
  const bsky = await db.query.blueskyAccount.findFirst({
    where: eq(blueskyAccount.userId, userId),
  });
  if (bsky) return bsky.did;

  const masto = await db.query.mastodonAccount.findFirst({
    where: eq(mastodonAccount.userId, userId),
    with: { mastodonInstance: true },
  });
  if (masto?.username && masto.mastodonInstance?.instance) {
    return mastodonActorUri(masto.mastodonInstance.instance, masto.username);
  }
  return null;
};
