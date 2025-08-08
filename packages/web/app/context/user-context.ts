import { unstable_createContext } from "react-router";
import type { SubscriptionStatus } from "~/utils/auth.server";
import type { AppType } from "@sill/api";
import type { InferResponseType } from "hono/client";
import type { hc } from "hono/client";

// Create a client type and extract the profile response type
type Client = ReturnType<typeof hc<AppType>>;
type ProfileResponse = InferResponseType<
	Client["api"]["auth"]["profile"]["$get"],
	200
>;

export interface UserProfile extends ProfileResponse {
	subscriptionStatus: SubscriptionStatus;
}

export const userContext = unstable_createContext<UserProfile | null>(null);
