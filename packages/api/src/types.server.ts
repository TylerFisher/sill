// API-specific types that use database schemas
import type {
	Link,
	LinkPost,
	List,
	MastodonAccount,
	MastodonInstance,
	MostRecentLinkPosts,
	NotificationQuery,
	ListOption,
	AccountWithInstance,
} from "@sill/schema";

// Re-export the types from schema for API usage
export type {
	MostRecentLinkPosts,
	NotificationQuery,
	ListOption,
	AccountWithInstance,
};
