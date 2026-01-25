import type {
  SubscriptionStatus,
  digestSettings,
  blueskyAccount as BlueskyAccountType,
} from "@sill/schema";
import type { UserProfile } from "~/context/user-context";

export type BlueskyAccount = typeof BlueskyAccountType.$inferSelect;
export type DigestSettings = typeof digestSettings.$inferSelect;

export interface Step {
  id: string;
  title: string;
  description: string;
}

export interface WelcomeContentProps {
  subscribed: SubscriptionStatus;
  searchParams: URLSearchParams;
  user: UserProfile;
  digestSettingsPromise: Promise<{ settings: DigestSettings | undefined }>;
}

export const STEPS: Step[] = [
  {
    id: "accounts",
    title: "Connect Accounts",
    description: "Connect additional social media accounts",
  },
  {
    id: "lists",
    title: "Subscribe to Lists",
    description: "Track links from specific groups in your network",
  },
  {
    id: "email",
    title: "Email & Digest",
    description: "Add an email and set up your daily digest",
  },
];
