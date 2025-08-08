import { unstable_createContext } from "react-router";
import type { SubscriptionStatus } from "~/utils/auth.server";

export interface UserProfile {
	id: string;
	email: string;
	name: string;
	subscriptionStatus: SubscriptionStatus;
	createdAt: string;
	blueskyAccounts: any[];
	mastodonAccounts: any[];
	bookmarks: any[];
}

export const userContext = unstable_createContext<UserProfile | null>(null);
