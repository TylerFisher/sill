// API-specific types that use database schemas
import type {
	link,
	linkPostDenormalized,
	list,
	mastodonAccount,
	mastodonInstance,
} from "./database/schema.server.js";

/**
 * Type for the returned most recent link posts query
 */
export type MostRecentLinkPosts = {
	uniqueActorsCount: number;
	link: typeof link.$inferSelect | null;
	posts?: (typeof linkPostDenormalized.$inferSelect)[];
};

/**
 * Notification query interface for building notification filters
 */
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

type Account = typeof mastodonAccount.$inferSelect;
export interface AccountWithInstance extends Account {
	mastodonInstance: typeof mastodonInstance.$inferSelect;
	lists: (typeof list.$inferSelect)[];
}
