import type {
  NodeSavedSession,
  NodeSavedSessionStore,
  NodeSavedState,
  NodeSavedStateStore,
} from "@atproto/oauth-client-node";
import { eq, sql } from "drizzle-orm";
import { db, atprotoAuthSession, atprotoAuthState } from "@sill/schema";

// Helper to create advisory lock ID from string
function stringToLockId(str: string): bigint {
  let hash = 5381n;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5n) + hash) + BigInt(str.charCodeAt(i));
  }
  return hash % 2147483647n;
}

/**
 * State store for Bluesky OAuth client
 */
export class StateStore implements NodeSavedStateStore {
  async get(key: string): Promise<NodeSavedState | undefined> {
    const authState = await db.query.atprotoAuthState.findFirst({
      where: eq(atprotoAuthState.key, key),
    });
    if (!authState) return;
    return JSON.parse(authState.state) as NodeSavedState;
  }

  async set(key: string, state: NodeSavedState) {
    const data = { key, state: JSON.stringify(state) };
    await db.insert(atprotoAuthState).values(data).onConflictDoUpdate({
      target: atprotoAuthState.key,
      set: data,
    });
  }

  async del(key: string) {
    await db.delete(atprotoAuthState).where(eq(atprotoAuthState.key, key));
  }
}

/**
 * Session store for Bluesky OAuth client with per-session locking
 *
 * Uses pg_advisory_xact_lock within transactions to ensure locks are properly
 * released. This prevents token refresh conflicts between the API server and
 * worker processes by serializing access to OAuth sessions across processes.
 *
 * Transaction-level locks are automatically released when the transaction ends
 * (commit or rollback), avoiding the connection pool issues with session-level locks.
 */
export class SessionStore implements NodeSavedSessionStore {
  async get(key: string): Promise<NodeSavedSession | undefined> {
    const lockId = stringToLockId(`session:${key}`);

    return await db.transaction(async (tx) => {
      // Transaction-level advisory lock - blocks other processes/transactions
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockId})`);

      const authSession = await tx.query.atprotoAuthSession.findFirst({
        where: eq(atprotoAuthSession.key, key),
      });
      if (!authSession) return;
      return JSON.parse(authSession.session) as NodeSavedSession;
      // Lock automatically released at transaction end
    });
  }

  async set(key: string, session: NodeSavedSession) {
    const lockId = stringToLockId(`session:${key}`);

    await db.transaction(async (tx) => {
      // Transaction-level advisory lock - blocks other processes/transactions
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockId})`);

      const data = { key, session: JSON.stringify(session) };
      await tx.insert(atprotoAuthSession).values(data).onConflictDoUpdate({
        target: atprotoAuthSession.key,
        set: data,
      });
      // Lock automatically released at transaction end
    });
  }

  async del(key: string) {
    const lockId = stringToLockId(`session:${key}`);

    await db.transaction(async (tx) => {
      // Transaction-level advisory lock - blocks other processes/transactions
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockId})`);
      await tx.delete(atprotoAuthSession).where(eq(atprotoAuthSession.key, key));
      // Lock automatically released at transaction end
    });
  }
}
