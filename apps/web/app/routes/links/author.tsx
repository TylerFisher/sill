import { invariantResponse } from "@epic-web/invariant";
import { Box, Flex, Spinner, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { Await, type ShouldRevalidateFunctionArgs } from "react-router";
import FilterBar from "~/components/forms/FilterBar";
import FilterSidebar from "~/components/forms/FilterSidebar";
import AboutTopper from "~/components/linkPosts/AboutTopper";
import PaginatedLinksList from "~/components/linkPosts/PaginatedLinksList";
import Layout from "~/components/nav/Layout";
import {
	apiFindLinksByAuthor,
	apiGetFilterPresets,
} from "~/utils/api-client.server";
import { requireUserFromContext } from "~/utils/context.server";
import {
	discoveryTimeLabel,
	parseDiscoveryFilters,
} from "~/utils/discoveryFilters";
import type { Route } from "./+types/author";

export const loader = async ({
	params,
	context,
	request,
}: Route.LoaderArgs) => {
	const existingUser = await requireUserFromContext(context);
	const subscribed = existingUser.subscriptionStatus;

	invariantResponse(existingUser, "Not found", { status: 404 });

	const author = params.author;
	const url = new URL(request.url);
	const cursor = url.searchParams.get("cursor") || undefined;
	const filters = parseDiscoveryFilters(
		url.searchParams,
		subscribed === "plus",
	);

	// Stream the first page (HTML streaming, like the main feed); resolve cursor
	// (infinite-scroll) requests so the paginating fetcher gets data directly.
	const resultPromise = apiFindLinksByAuthor(request, {
		author,
		cursor,
		...filters,
	});
	const result = cursor ? await resultPromise : resultPromise;

	const bsky = existingUser.blueskyAccounts[0] || null;
	const mastodon = existingUser.mastodonAccounts[0] || null;
	const lists = [...(bsky?.lists ?? []), ...(mastodon?.lists ?? [])];

	const filterPresets = await apiGetFilterPresets(request)
		.then((r) => r.presets)
		.catch((error) => {
			console.error("Load filter presets error:", error);
			return [] as Awaited<ReturnType<typeof apiGetFilterPresets>>["presets"];
		});

	return {
		result,
		instance: mastodon?.mastodonInstance?.instance,
		bsky: bsky?.handle,
		lists,
		bookmarks: existingUser.bookmarks,
		subscribed,
		author,
		filterPresets,
		timeLabel: discoveryTimeLabel(url.searchParams, subscribed === "plus"),
	};
};

// Saving/deleting a view shouldn't reload the streaming feed; FilterPresets
// refreshes itself from the mutation's returned list.
export function shouldRevalidate({
	formAction,
	defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
	if (formAction === "/api/filter-presets") return false;
	return defaultShouldRevalidate;
}

export const meta: Route.MetaFunction = ({ data }) => [
	{ title: `Sill | Links by ${data?.author || ""}` },
];

const LinksByAuthor = ({ loaderData }: Route.ComponentProps) => {
	const {
		result,
		instance,
		bsky,
		lists,
		bookmarks,
		subscribed,
		filterPresets,
		timeLabel,
	} = loaderData;
	const showService = !!(bsky && instance);

	return (
		<Layout
			sidebar={
				<FilterSidebar
					showService={showService}
					lists={lists}
					subscribed={subscribed}
					presets={filterPresets}
					hideSearch
				/>
			}
		>
			<Box display={{ initial: "block", sm: "none" }}>
				<FilterBar
					showService={showService}
					lists={lists}
					subscribed={subscribed}
					presets={filterPresets}
					hideSearch
				/>
			</Box>
			<Suspense
				fallback={
					<Flex justify="center" py="6">
						<Spinner size="3" />
					</Flex>
				}
			>
				<Await
					resolve={result}
					errorElement={
						<Box>
							<Text as="p">Failed to load links. Try refreshing the page.</Text>
						</Box>
					}
				>
					{(res) => (
						<>
							{res.about && (
								<AboutTopper
									about={res.about}
									kind="author"
									timeLabel={timeLabel}
								/>
							)}
							<PaginatedLinksList
								links={res.links}
								cursor={res.cursor}
								instance={instance}
								bsky={bsky}
								bookmarks={bookmarks}
								subscribed={subscribed}
							/>
						</>
					)}
				</Await>
			</Suspense>
		</Layout>
	);
};

export default LinksByAuthor;
