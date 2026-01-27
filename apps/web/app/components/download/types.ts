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
    description:
      "Sill looks at Bluesky and Mastodon timelines. You can connect both to your account here.",
  },
  {
    id: "lists",
    title: "Subscribe to Lists",
    description:
      "Sill can also watch your custom lists and feeds for additional links.",
  },
  {
    id: "email",
    title: "Set up Daily Digest",
    description:
      "Sill can send you a daily digest of your top links. Choose how you'd like to receive it.",
  },
];
