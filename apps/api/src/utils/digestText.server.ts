import type { MostRecentLinkPosts } from "@sill/schema";

export const subject = "Your Sill Daily Digest";

export const preview = (linkPosts: MostRecentLinkPosts[]) => {
  if (linkPosts.length === 0) {
    return "Sill is having trouble syncing with your Bluesky and/or Mastodon accounts";
  }
  const hosts = linkPosts
    .map((linkPost) => new URL(linkPost.link?.url || "").hostname)
    .slice(0, 3);

  const hostString = hosts.join(", ");
  return `Today's top links from ${hostString}`;
};

export const title = "Your Sill Daily Digest";

export const intro = (name: string | null) =>
  `Hello${name ? ` ${name}` : ""}, here are your top links from the past 24 hours across your social networks.`;

export const firstFeedItem = (name: string | null) =>
  `Welcome to Sill's Daily Digest${name ? `, ${name}` : ""}! We'll send your first Daily Digest at your scheduled time.`;
