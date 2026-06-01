import { invariantResponse } from "@epic-web/invariant";
import { Box, Flex, Spinner, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { Await } from "react-router";
import LinkFilters from "~/components/forms/LinkFilters";
import LinkFiltersCollapsible from "~/components/forms/LinkFiltersCollapsible";
import SortPresetList from "~/components/forms/SortPresetList";
import AboutTopper from "~/components/linkPosts/AboutTopper";
import PaginatedLinksList from "~/components/linkPosts/PaginatedLinksList";
import Layout from "~/components/nav/Layout";
import { apiFindLinksByDomain } from "~/utils/api-client.server";
import { requireUserFromContext } from "~/utils/context.server";
import {
	DISCOVERY_TIME_OPTIONS,
	parseDiscoveryFilters,
} from "~/utils/discoveryFilters";
import type { Route } from "./+types/domain";

export const loader = async ({
	params,
	context,
	request,
}: Route.LoaderArgs) => {
	const existingUser = await requireUserFromContext(context);
	const subscribed = existingUser.subscriptionStatus;

	invariantResponse(existingUser, "Not found", { status: 404 });

	const domain = params.domain;
	const url = new URL(request.url);
	const cursor = url.searchParams.get("cursor") || undefined;
	// A specific publication on the host (e.g. "The Athletic"); omit → primary.
	const publication = url.searchParams.get("publication") || undefined;
	const filters = parseDiscoveryFilters(url.searchParams);

	// Stream the first page (HTML streaming, like the main feed); resolve cursor
	// (infinite-scroll) requests so the paginating fetcher gets data directly.
	const resultPromise = apiFindLinksByDomain(request, {
		domain,
		publication,
		cursor,
		...filters,
	});
	const result = cursor ? await resultPromise : resultPromise;

	const bsky = existingUser.blueskyAccounts[0] || null;
	const mastodon = existingUser.mastodonAccounts[0] || null;
	const lists =
		subscribed !== "free"
			? [...(bsky?.lists ?? []), ...(mastodon?.lists ?? [])]
			: [];

	return {
		result,
		instance: mastodon?.mastodonInstance?.instance,
		bsky: bsky?.handle,
		lists,
		bookmarks: existingUser.bookmarks,
		subscribed,
		domain,
	};
};

// Title uses the raw domain: the human-readable publisher name lives on the
// streamed `about` card, which isn't available to `meta` (deferred data).
export const meta: Route.MetaFunction = ({ data }) => [
	{ title: `Sill | Links from ${data?.domain || ""}` },
];

const LinksByDomain = ({ loaderData }: Route.ComponentProps) => {
	const { result, instance, bsky, lists, bookmarks, subscribed } = loaderData;
	const showService = !!(bsky && instance);

	return (
		<Layout
			sidebar={
				<LinkFilters
					showService={showService}
					lists={lists}
					hideSearch
					timeOptions={DISCOVERY_TIME_OPTIONS}
				/>
			}
		>
			<SortPresetList />
			<LinkFiltersCollapsible>
				<LinkFilters
					showService={showService}
					lists={lists}
					reverse
					hideSort
					hideSearch
					timeOptions={DISCOVERY_TIME_OPTIONS}
				/>
			</LinkFiltersCollapsible>
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
							{res.about && <AboutTopper about={res.about} kind="domain" />}
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

export default LinksByDomain;
