import type { NodeSavedSession, NodeSavedSessionStore, NodeSavedState, NodeSavedStateStore } from "@atproto/oauth-client-node";
/**
 * State store for Bluesky OAuth client
 */
export declare class StateStore implements NodeSavedStateStore {
    get(key: string): Promise<NodeSavedState | undefined>;
    set(key: string, state: NodeSavedState): Promise<void>;
    del(key: string): Promise<void>;
}
/**
 * Session store for Bluesky OAuth client
 */
export declare class SessionStore implements NodeSavedSessionStore {
    get(key: string): Promise<NodeSavedSession | undefined>;
    set(key: string, session: NodeSavedSession): Promise<void>;
    del(key: string): Promise<void>;
}
