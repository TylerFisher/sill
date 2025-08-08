import type {
	NodeSavedSession,
	NodeSavedSessionStore,
	NodeSavedState,
	NodeSavedStateStore,
} from "@atproto/oauth-client-node";
import { eq } from "drizzle-orm";
import { db } from "../database/db.server";
import { atprotoAuthSession, atprotoAuthState } from "../database/schema.server";

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
 * Session store for Bluesky OAuth client
 */
export class SessionStore implements NodeSavedSessionStore {
	async get(key: string): Promise<NodeSavedSession | undefined> {
		const authSession = await db.query.atprotoAuthSession.findFirst({
			where: eq(atprotoAuthSession.key, key),
		});
		if (!authSession) return;
		return JSON.parse(authSession.session) as NodeSavedSession;
	}

	async set(key: string, session: NodeSavedSession) {
		const data = { key, session: JSON.stringify(session) };
		await db.insert(atprotoAuthSession).values(data).onConflictDoUpdate({
			target: atprotoAuthSession.key,
			set: data,
		});
	}

	async del(key: string) {
		await db.delete(atprotoAuthSession).where(eq(atprotoAuthSession.key, key));
	}
}