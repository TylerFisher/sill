import { eq } from "drizzle-orm";
import { db } from "../database/db.server";
import { atprotoAuthSession, atprotoAuthState } from "../database/schema.server";
/**
 * State store for Bluesky OAuth client
 */
export class StateStore {
    async get(key) {
        const authState = await db.query.atprotoAuthState.findFirst({
            where: eq(atprotoAuthState.key, key),
        });
        if (!authState)
            return;
        return JSON.parse(authState.state);
    }
    async set(key, state) {
        const data = { key, state: JSON.stringify(state) };
        await db.insert(atprotoAuthState).values(data).onConflictDoUpdate({
            target: atprotoAuthState.key,
            set: data,
        });
    }
    async del(key) {
        await db.delete(atprotoAuthState).where(eq(atprotoAuthState.key, key));
    }
}
/**
 * Session store for Bluesky OAuth client
 */
export class SessionStore {
    async get(key) {
        const authSession = await db.query.atprotoAuthSession.findFirst({
            where: eq(atprotoAuthSession.key, key),
        });
        if (!authSession)
            return;
        return JSON.parse(authSession.session);
    }
    async set(key, session) {
        const data = { key, session: JSON.stringify(session) };
        await db.insert(atprotoAuthSession).values(data).onConflictDoUpdate({
            target: atprotoAuthSession.key,
            set: data,
        });
    }
    async del(key) {
        await db.delete(atprotoAuthSession).where(eq(atprotoAuthSession.key, key));
    }
}
