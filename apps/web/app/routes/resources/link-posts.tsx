import type { MostRecentLinkPosts } from "@sill/schema";
import { apiFilterLinkOccurrences } from "~/utils/api-client.server";
import { requireUserFromContext } from "~/utils/context.server";
import { isPlusTimeValue, timeParamToMs } from "~/utils/timeRange";
import type { Route } from "./+types/link-posts";

/**
 * On-demand hydration of a single URL's posts, used when a link card is
 * expanded. Mirrors the timeline filters from the query string so the share set
 * matches the list. Returns just the posts for that URL.
 */
export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const userProfile = await requireUserFromContext(context);
	const url = new URL(request.url);
	const target = url.searchParams.get("url");
	if (!target) return { posts: [] as MostRecentLinkPosts["posts"] };

	// Keep the expanded card's window in sync with the feed: the Sill+ windows
	// are clamped to the default for free users there, so clamp here too.
	const timeParam = url.searchParams.get("time");
	const time = timeParamToMs(
		userProfile.subscriptionStatus !== "plus" && isPlusTimeValue(timeParam)
			? null
			: timeParam,
	);

	const repostsParam = url.searchParams.get("reposts");
	const hideReposts: "include" | "exclude" | "only" = (
		["include", "exclude", "only"] as const
	).includes(repostsParam as "include" | "exclude" | "only")
		? (repostsParam as "include" | "exclude" | "only")
		: "include";

	const serviceParam = url.searchParams.get("service");
	const service = ["mastodon", "bluesky", "all"].includes(serviceParam || "")
		? (serviceParam as "mastodon" | "bluesky" | "all")
		: "all";

	try {
		const result = await apiFilterLinkOccurrences(request, {
			url: target,
			time,
			hideReposts,
			service,
			selectedList: url.searchParams.get("list") || "all",
			query: url.searchParams.get("query") || undefined,
			limit: 1,
			fetch: false,
		});
		return { posts: result.links[0]?.posts ?? [] };
	} catch (error) {
		console.error("link-posts hydration error:", error);
		return { posts: [] as MostRecentLinkPosts["posts"] };
	}
};
