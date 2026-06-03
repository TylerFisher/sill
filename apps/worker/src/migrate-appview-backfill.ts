/**
 * One-off backfill: re-fetch the last ~24h of Mastodon + Bluesky list shares
 * live from the networks and push them to the AppView (`POST /v1/shares`), so a
 * production cutover to the AppView read path starts with recent history
 * instead of an empty window.
 *
 * This reuses the exact worker ingestion path (`fetchLinks`) with the
 * `ignoreCursor` option, which makes the fetchers ignore each list/account's
 * stored `mostRecentPost*` cursor and pull the full default window (last 24h)
 * rather than only what's new since the last pass. Fetching (rather than reading
 * the denormalized DB rows) gives faithful `at://` + DID identifiers, raw post
 * text, and current handles — none of the DB-reconstruction caveats.
 *
 * Scope mirrors the worker:
 *   - Bluesky lists/feeds (Bluesky home-timeline follows are native to the
 *     AppView, so `getLinksFromBluesky` never fetches them).
 *   - Mastodon home timeline (source `follows`) + Mastodon lists.
 * Candidate set: Bluesky accounts active in the last 24h (a recent
 * `mostRecentPostDate` ⇒ live OAuth token + recent data) UNION all Mastodon
 * accounts (Mastodon-only users included — `fetchLinks`/`getLinksFromMastodon`
 * key them by their actor URI). The Bluesky recency filter skips the large pool
 * of dead-OAuth accounts (issuer migrations / expired refresh) that would fetch
 * nothing; Mastodon isn't filtered (it uses long-lived tokens and has no
 * timestamp cursor).
 *
 * Env (point at PRODUCTION):
 *   DATABASE_URL, APPVIEW_API_URL, APPVIEW_API_KEY   required (unless DRY_RUN)
 *   plus the provider credentials the worker already needs (OAuth keys, etc.)
 *   CONCURRENCY   users fetched in parallel, default 15
 *   USER_LIMIT    cap candidate users (for a smoke test), default all
 *   DRY_RUN=1     fetch + count, do not POST anything
 *
 * Run locally (dev deps present), from apps/worker:
 *   DRY_RUN=1 pnpm tsx --env-file ../../.env.production src/migrate-appview-backfill.ts
 *   pnpm tsx --env-file ../../.env.production src/migrate-appview-backfill.ts
 *
 * Run in the production image (tsx is pruned there): `npm run build:worker`
 * bundles this to `build/migrate-appview-backfill.js`, so run it with plain node
 * and the worker's env, e.g.:
 *   DRY_RUN=1 node build/migrate-appview-backfill.js
 *   node build/migrate-appview-backfill.js
 */

import {
  type PushShareBatch,
  clearOAuthSessionCache,
  fetchLinks,
  pushShareBatches,
} from "@sill/links";
import { blueskyAccount, db, list, mastodonAccount } from "@sill/schema";
import { eq, sql } from "drizzle-orm";

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.CONCURRENCY || "15", 10)
);
const USER_LIMIT = process.env.USER_LIMIT
  ? Number.parseInt(process.env.USER_LIMIT, 10)
  : undefined;

const stats = {
  candidateUsers: 0,
  usersFetched: 0,
  usersWithShares: 0,
  totalShares: 0,
  errors: 0,
  batchesPushed: 0,
};

const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

async function main(): Promise<void> {
  if (
    !DRY_RUN &&
    (!process.env.APPVIEW_API_URL || !process.env.APPVIEW_API_KEY)
  ) {
    console.error(
      "[backfill] APPVIEW_API_URL/APPVIEW_API_KEY are required (or set DRY_RUN=1)."
    );
    process.exit(1);
  }

  // Candidate set, unioned + deduped across both networks:
  //   - Bluesky accounts that are active in the last 24h AND have a connected
  //     list/feed. A recent `mostRecentPostDate` means the home-timeline fetch
  //     (same OAuth token the list fetch uses) succeeded recently, so the token
  //     is alive — this skips the large pool of dead-OAuth accounts (issuer
  //     migrations / expired refresh). The list requirement (inner join) skips
  //     Bluesky users with nothing to fetch: `getLinksFromBluesky` only pulls
  //     lists/feeds (the following timeline is native to the AppView), so a
  //     listless account contributes zero and just wastes an OAuth session
  //     restore.
  //   - ALL Mastodon accounts. Mastodon uses long-lived access tokens, not the
  //     atproto OAuth refresh that's broken broadly, so those fetch fine; and
  //     `mastodonAccount` has no timestamp cursor (only `mostRecentPostId`), so
  //     it can't be recency-filtered the same way. This also picks up
  //     Mastodon-only users, who `fetchLinks` keys by their actor URI.
  // `fetchLinks` pulls each user's Bluesky lists + (if present) Mastodon
  // timeline + lists, and returns null when there's nothing to push.
  const [bsky, masto] = await Promise.all([
    db
      .select({ userId: blueskyAccount.userId })
      .from(blueskyAccount)
      .innerJoin(list, eq(list.blueskyAccountId, blueskyAccount.id))
      .where(
        sql`${blueskyAccount.mostRecentPostDate} > now() - interval '24 hours'`
      ),
    db.select({ userId: mastodonAccount.userId }).from(mastodonAccount),
  ]);
  let userIds = [...new Set([...bsky, ...masto].map((a) => a.userId))];
  if (USER_LIMIT) userIds = userIds.slice(0, USER_LIMIT);
  stats.candidateUsers = userIds.length;

  console.log(
    `[backfill] ${userIds.length} candidate users  concurrency=${CONCURRENCY}  dryRun=${DRY_RUN}`
  );

  let done = 0;
  for (const group of chunk(userIds, CONCURRENCY)) {
    const results = await Promise.all(
      group.map((userId) =>
        fetchLinks(userId, undefined, {
          ignoreCursor: true,
          // Slow algorithmic feeds that take too long to page in the backfill;
          // the live worker still ingests them (it leaves this unset).
          skipListNames: [
            "Best of Follows",
            "Steam pc",
            "ATmosphere Dwellers",
            "News & Writing",
            "Art: What's Hot",
            "Popular en Español",
          ],
        }).catch((e) => {
          stats.errors++;
          console.error(`[backfill] fetch failed for ${userId}:`, e);
          return null;
        })
      )
    );
    stats.usersFetched += group.length;

    const batches: PushShareBatch[] = results.filter(
      (b): b is PushShareBatch => b != null && b.shares.length > 0
    );
    stats.usersWithShares += batches.length;
    stats.totalShares += batches.reduce((n, b) => n + b.shares.length, 0);

    if (batches.length > 0 && !DRY_RUN) {
      await pushShareBatches(batches);
      stats.batchesPushed += batches.length;
    }

    // Release the per-account Bluesky Agent + OAuth session objects this group
    // cached. They're keyed per DID and never reused across the run, so without
    // this the cache grows unbounded and OOMs over thousands of users (the live
    // worker clears it every tick; the backfill must do the same per group).
    clearOAuthSessionCache();

    done += group.length;
    console.log(
      `[backfill] ${done}/${userIds.length} users · ${
        stats.totalShares
      } shares · ${stats.usersWithShares} viewers${
        DRY_RUN ? " (dry-run)" : " pushed"
      }`
    );
  }

  console.log(`[backfill] done: ${JSON.stringify(stats, null, 2)}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[backfill] aborted:", e);
  console.error(`[backfill] stats: ${JSON.stringify(stats, null, 2)}`);
  process.exit(1);
});
