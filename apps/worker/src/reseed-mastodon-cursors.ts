/**
 * One-off re-seed for Mastodon-only accounts whose ingestion cursor froze at the
 * June 3 AppView cutover.
 *
 * Background: `getMastodonTimeline`'s 24h stop condition ignores reblogs (it only
 * stops on an older *original* post), so a reblog-heavy feed could page backwards
 * past the 90s fetch timeout and never advance `mastodonAccount.mostRecentPostId`.
 * Once stuck, every later pass had even more to page through and timed out again,
 * so no fresh Mastodon shares reached the AppView and these users' digests
 * stalled. It only showed on Mastodon-only users: dual-account users still got
 * fresh Bluesky firehose data, which masked the frozen Mastodon cursor.
 *
 * `mastodon.ts` now caps the pagination (MAX_TIMELINE_STATUSES), which un-sticks
 * accounts on their next worker pass. This script does it immediately for the
 * already-frozen ones: it re-runs the worker ingestion path with
 * `ignoreCursor: true` (drop the stuck cursor, pull a fresh 24h window, advance
 * the cursor) for the accounts whose cursor is actually stale, scoped to
 * Mastodon (`type: "mastodon"`) so a dual-account user's Bluesky lists aren't
 * needlessly re-fetched (their Bluesky data is already fresh from the firehose).
 * Mastodon-only users are where the freeze was visible, but the stale-cursor
 * filter catches dual-account users too — their Mastodon cursor froze the same
 * way, it was just masked by fresh Bluesky data. Healthy accounts are left
 * alone; they self-heal via the pagination cap on their next worker pass.
 *
 * Env (point at PRODUCTION): same as the backfill —
 *   DATABASE_URL, APPVIEW_API_URL, APPVIEW_API_KEY   required (unless DRY_RUN)
 *   plus the provider credentials the worker already needs.
 *   CONCURRENCY   users fetched in parallel, default 15
 *   USER_LIMIT    cap candidate users (for a smoke test), default all
 *   DRY_RUN=1     fetch + count, do not POST anything
 *   DIAGNOSE=1    read-only: probe each candidate and classify why its cursor is
 *                 stuck (fetchable / empty-feed / errored), no fetch or writes
 *
 * Run locally (dev deps present), from apps/worker:
 *   DRY_RUN=1 pnpm tsx --env-file ../../.env.production src/reseed-mastodon-cursors.ts
 *   pnpm tsx --env-file ../../.env.production src/reseed-mastodon-cursors.ts
 *
 * Run in the production image (`npm run build:worker` bundles this to
 * `build/reseed-mastodon-cursors.js`), with the worker's env:
 *   DRY_RUN=1 node build/reseed-mastodon-cursors.js
 *   node build/reseed-mastodon-cursors.js
 */

import {
  type MastodonProbe,
  type PushShareBatch,
  clearOAuthSessionCache,
  fetchLinks,
  probeMastodonAccount,
  pushShareBatches,
} from "@sill/links";
import { db, mastodonAccount } from "@sill/schema";
import { sql } from "drizzle-orm";

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
// Read-only classification: probe each candidate (token alive? feed non-empty?)
// and print a per-account line + summary, without fetching links or touching any
// cursor. Use this to find out *why* the frozen accounts won't advance.
const DIAGNOSE =
  process.env.DIAGNOSE === "1" || process.env.DIAGNOSE === "true";
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

// Mastodon Snowflake → ISO time (id >> 16 ms). Numeric (Mastodon-core) IDs only.
const decodeSnowflake = (id: string | null): string | null => {
  if (!id || !/^[0-9]+$/.test(id)) return null;
  try {
    return new Date(Number(BigInt(id) >> 16n)).toISOString();
  } catch {
    return null;
  }
};

/**
 * Read-only: probe each account and classify why its cursor is or isn't fetchable.
 *   fetchable  — token works and the feed has statuses; a real re-seed WOULD
 *                advance the cursor (so if it's still frozen, the run never
 *                reached it, or ran without ignoreCursor/the cap).
 *   empty-feed — token works but the home timeline is empty; nothing to advance.
 *   errored    — verifyCredentials/timeline threw (dead token, dead instance).
 *                These can't be re-seeded by anything.
 */
async function diagnose(userIds: string[]): Promise<void> {
  console.log(
    `[diag] probing ${userIds.length} accounts read-only (no fetch, no cursor changes)`
  );
  let fetchable = 0;
  let emptyFeed = 0;
  let errored = 0;
  const errorKinds = new Map<string, number>();

  for (const group of chunk(userIds, CONCURRENCY)) {
    const probes = await Promise.all(
      group.map((userId) =>
        probeMastodonAccount(userId).catch(
          (e): MastodonProbe => ({
            userId,
            instance: null,
            username: null,
            ok: false,
            error:
              e instanceof Error
                ? `${e.constructor.name}: ${e.message}`
                : String(e),
            statuses: 0,
            newestStatusAt: null,
            cursor: null,
          })
        )
      )
    );

    for (const p of probes) {
      const cursorAt = decodeSnowflake(p.cursor) ?? "-";
      if (!p.ok) {
        errored++;
        const kind = (p.error ?? "unknown").split(":")[0];
        errorKinds.set(kind, (errorKinds.get(kind) ?? 0) + 1);
        console.log(
          `[diag] ERR  ${p.instance ?? "?"}  cursor=${cursorAt}  ${p.error}`
        );
      } else if (p.statuses === 0) {
        emptyFeed++;
        console.log(
          `[diag] ok   ${p.instance ?? "?"}  cursor=${cursorAt}  statuses=0 (empty feed)`
        );
      } else {
        fetchable++;
        console.log(
          `[diag] ok   ${p.instance ?? "?"}  cursor=${cursorAt}  statuses=${p.statuses}  newest=${p.newestStatusAt ?? "-"}`
        );
      }
    }
  }

  console.log(
    `[diag] summary: ${fetchable} fetchable · ${emptyFeed} empty-feed · ${errored} errored`
  );
  console.log(
    `[diag] error kinds: ${JSON.stringify(Object.fromEntries(errorKinds))}`
  );
}

async function main(): Promise<void> {
  if (
    !DRY_RUN &&
    !DIAGNOSE &&
    (!process.env.APPVIEW_API_URL || !process.env.APPVIEW_API_KEY)
  ) {
    console.error(
      "[reseed] APPVIEW_API_URL/APPVIEW_API_KEY are required (or set DRY_RUN=1)."
    );
    process.exit(1);
  }

  // Only accounts whose cursor is actually stale — frozen at the June 3 cutover
  // (or otherwise stuck) — across both Mastodon-only and dual-account users.
  // Re-seeding the whole pool is wasteful: most accounts are healthy (they
  // self-heal via the pagination cap on their next worker pass) or dormant (a
  // live fetch with no links to push), so it just churns and surfaces dead-token
  // errors for no gain.
  //
  // Mastodon status IDs are Snowflakes, so the cursor's time is id >> 16 (ms);
  // here as floor(id / 65536). Only Mastodon-core uses numeric IDs — Pleroma /
  // GoToSocial use non-numeric IDs we can't decode, so their stuck accounts are
  // left to the pagination cap rather than re-seeded here.
  const rows = await db
    .select({ userId: mastodonAccount.userId })
    .from(mastodonAccount)
    .where(
      sql`${mastodonAccount.mostRecentPostId} ~ '^[0-9]+$'
          AND to_timestamp(floor(${mastodonAccount.mostRecentPostId}::numeric / 65536) / 1000.0)
              < now() - interval '3 days'`,
    );

  let userIds = [...new Set(rows.map((r) => r.userId))];
  if (USER_LIMIT) userIds = userIds.slice(0, USER_LIMIT);
  stats.candidateUsers = userIds.length;

  if (DIAGNOSE) {
    await diagnose(userIds);
    process.exit(0);
  }

  console.log(
    `[reseed] ${userIds.length} users with a Mastodon account  concurrency=${CONCURRENCY}  dryRun=${DRY_RUN}`
  );

  let done = 0;
  for (const group of chunk(userIds, CONCURRENCY)) {
    const results = await Promise.all(
      group.map((userId) =>
        // `"mastodon"` scopes the re-seed to the Mastodon timeline + lists, so a
        // dual-account user's Bluesky lists aren't re-fetched (their Bluesky data
        // is already fresh via the firehose).
        fetchLinks(userId, "mastodon", { ignoreCursor: true }).catch((e) => {
          stats.errors++;
          console.error(`[reseed] fetch failed for ${userId}:`, e);
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

    // Scoping to Mastodon caches no Bluesky agents, but keep this in step with
    // the backfill/worker so the run stays flat on memory regardless.
    clearOAuthSessionCache();

    done += group.length;
    console.log(
      `[reseed] ${done}/${userIds.length} users · ${
        stats.totalShares
      } shares · ${stats.usersWithShares} viewers${
        DRY_RUN ? " (dry-run)" : " pushed"
      }`
    );
  }

  console.log(`[reseed] done: ${JSON.stringify(stats, null, 2)}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[reseed] aborted:", e);
  console.error(`[reseed] stats: ${JSON.stringify(stats, null, 2)}`);
  process.exit(1);
});
