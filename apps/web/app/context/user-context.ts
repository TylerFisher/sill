import { unstable_createContext } from "react-router";
import type { SubscriptionStatus } from "@sill/schema";
import type { AppType } from "@sill/api";
import type { InferResponseType } from "hono/client";
import type { hc } from "hono/client";

// Create a client type and extract the profile response type
type Client = ReturnType<typeof hc<AppType>>;
type ProfileResponse = InferResponseType<
  Client["api"]["auth"]["profile"]["$get"],
  200
>;

// Extend ProfileResponse with additional fields that the API returns
// Some fields are optional to handle stale type inference from Hono client
export interface UserProfile
  extends Omit<ProfileResponse, "subscriptionStatus"> {
  subscriptionStatus: SubscriptionStatus;
  hasPassword: boolean;
  activeSyncs: Array<{
    syncId: string;
    label: string;
    status: string;
  }>;
}

export const userContext = unstable_createContext<UserProfile | null>(null);
