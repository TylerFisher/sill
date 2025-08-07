// API-specific types that use database schemas
import type { link, linkPostDenormalized } from "./database/schema.server.js";

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