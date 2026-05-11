import type {
  NodeSavedSession,
  NodeSavedSessionStore,
  NodeSavedState,
  NodeSavedStateStore,
} from "@atproto/oauth-client-node";
import { eq } from "drizzle-orm";
import { db, atprotoAuthSession, atprotoAuthState } from "@sill/schema";

/**
 * State store for Bluesky OAuth client.
 *
 * Keys are namespaced by the owning client's `client_id` so that two
 * NodeOAuthClient instances (v1 and v2 during scope migration) can share
 * the underlying table without clobbering each other's state rows.
 */
export class StateStore implements NodeSavedStateStore {
  constructor(private readonly clientId: string) {}

  private k(key: string): string {
    return `${this.clientId}::${key}`;
  }

  async get(key: string): Promise<NodeSavedState | undefined> {
    const authState = await db.query.atprotoAuthState.findFirst({
      where: eq(atprotoAuthState.key, this.k(key)),
    });
    if (!authState) return;
    return JSON.parse(authState.state) as NodeSavedState;
  }

  async set(key: string, state: NodeSavedState) {
    const data = { key: this.k(key), state: JSON.stringify(state) };
    await db.insert(atprotoAuthState).values(data).onConflictDoUpdate({
      target: atprotoAuthState.key,
      set: data,
    });
  }

  async del(key: string) {
    await db
      .delete(atprotoAuthState)
      .where(eq(atprotoAuthState.key, this.k(key)));
  }
}

/**
 * Session store for Bluesky OAuth client. See StateStore for namespacing rationale.
 *
 * `get` self-heals legacy un-namespaced rows: rows written before the per-client-id
 * namespacing existed are keyed by raw DID. On a prefixed miss we look up the bare
 * key and, on hit, rewrite the row to the prefixed form so future reads take the
 * fast path. This avoids needing a one-shot data migration coordinated with deploy.
 */
export class SessionStore implements NodeSavedSessionStore {
  constructor(private readonly clientId: string) {}

  private k(key: string): string {
    return `${this.clientId}::${key}`;
  }

  async get(key: string): Promise<NodeSavedSession | undefined> {
    const prefixed = this.k(key);
    const hit = await db.query.atprotoAuthSession.findFirst({
      where: eq(atprotoAuthSession.key, prefixed),
    });
    if (hit) return JSON.parse(hit.session) as NodeSavedSession;

    const legacy = await db.query.atprotoAuthSession.findFirst({
      where: eq(atprotoAuthSession.key, key),
    });
    if (!legacy) return undefined;

    try {
      await db
        .update(atprotoAuthSession)
        .set({ key: prefixed })
        .where(eq(atprotoAuthSession.key, key));
    } catch {
      // PK conflict: a prefixed row already exists (e.g. another worker
      // self-healed concurrently, or a prior token refresh wrote one). The
      // prefixed row is the canonical winner — drop the orphaned legacy row.
      await db
        .delete(atprotoAuthSession)
        .where(eq(atprotoAuthSession.key, key));
    }
    return JSON.parse(legacy.session) as NodeSavedSession;
  }

  async set(key: string, session: NodeSavedSession) {
    const data = { key: this.k(key), session: JSON.stringify(session) };
    await db.insert(atprotoAuthSession).values(data).onConflictDoUpdate({
      target: atprotoAuthSession.key,
      set: data,
    });
  }

  async del(key: string) {
    await db
      .delete(atprotoAuthSession)
      .where(eq(atprotoAuthSession.key, this.k(key)));
  }
}
