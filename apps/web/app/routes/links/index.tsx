import { Box, Card, Flex, Separator, Spinner, Text } from "@radix-ui/themes";
import { Suspense, useEffect, useRef, useState } from "react";
import {
	Await,
	useFetcher,
	useLocation,
	useNavigation,
	useSearchParams,
} from "react-router";
import { debounce } from "ts-debounce";
import { uuidv7 } from "uuidv7-js";
import LinkFilters from "~/components/forms/LinkFilters";
import LinkFiltersCollapsible from "~/components/forms/LinkFiltersCollapsible";
import SortPresetList from "~/components/forms/SortPresetList";
import LinkPostRep from "~/components/linkPosts/LinkPostRep";
import Layout from "~/components/nav/Layout";
import { useOptimisticMutes } from "~/hooks/useOptimisticMutes";
import { useLayout } from "~/routes/resources/layout-switch";
import type { SubscriptionStatus } from "@sill/schema";
import { requireUserFromContext } from "~/utils/context.server";
import { timeParamToMs } from "~/utils/timeRange";
import type { MostRecentLinkPosts } from "@sill/schema";
import type { Route } from "./+types/index";
import {
	apiFilterLinkOccurrences,
	apiCheckBlueskyStatus,
} from "~/utils/api-client.server";
import type { BookmarkWithLinkPosts } from "../bookmarks";
import { redirect } from "react-router";

export const meta: Route.MetaFunction = () => [{ title: "Sill" }];

export const config = {
	maxDuration: 300,
};

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const userProfile = await requireUserFromContext(context);
	const subscribed = userProfile.subscriptionStatus;

	// Use the social accounts from the API response
	const bsky = userProfile.blueskyAccounts[0] || null;

	// Check if we need to reauthenticate with Bluesky
	if (bsky) {
		try {
			const statusResult = await apiCheckBlueskyStatus(request);

			// If re-authorization is needed, redirect to the OAuth URL
			if (
				statusResult.needsAuth &&
				"redirectUrl" in statusResult &&
				statusResult.redirectUrl
			) {
				return redirect(statusResult.redirectUrl);
			}

			// If there's an error with resolver, redirect to settings
			if (
				statusResult.status === "error" &&
				"error" in statusResult &&
				statusResult.error === "resolver"
			) {
				return redirect("/settings?tab=connect&error=resolver");
			}
		} catch (error) {
			console.error("Bluesky status check error:", error);
			// Continue loading the page even if status check fails
		}
	}

	// Use the Mastodon account from the API response
	const mastodon = userProfile.mastodonAccounts[0] || null;
	const bookmarks = userProfile.bookmarks;

	const url = new URL(request.url);

	const minSharesParam = url.searchParams.get("minShares");
	const minShares = minSharesParam
		? Number.parseInt(minSharesParam)
		: undefined;

	// Backwards compatibility: translate old boolean values to new string values
	const repostsParam = url.searchParams.get("reposts");
	let hideReposts: "include" | "exclude" | "only" = "include";
	let needsRedirect = false;

	if (repostsParam === "false") {
		hideReposts = "include";
		needsRedirect = true;
	} else if (repostsParam === "true") {
		hideReposts = "exclude";
		needsRedirect = true;
	} else if (repostsParam && ["include", "exclude", "only"].includes(repostsParam)) {
		hideReposts = repostsParam as "include" | "exclude" | "only";
	}

	// Redirect to update the URL with the new parameter value
	if (needsRedirect) {
		const newUrl = new URL(request.url);
		newUrl.searchParams.set("reposts", hideReposts);
		throw redirect(newUrl.toString());
	}

	const options = {
		hideReposts,
		sort: url.searchParams.get("sort") || "popularity",
		query: url.searchParams.get("query") || undefined,
		// eugh, clean this up
		service: ["mastodon", "bluesky", "all"].includes(
			url.searchParams.get("service") || "",
		)
			? (url.searchParams.get("service") as "mastodon" | "bluesky" | "all")
			: "all",
		page: Number.parseInt(url.searchParams.get("page") || "1"),
		selectedList: url.searchParams.get("list") || "all",
		minShares: minShares && minShares > 0 ? minShares : undefined,
	};

	const time = timeParamToMs(url.searchParams.get("time"));

	const links = apiFilterLinkOccurrences(request, {
		time,
		fetch: false,
		...options,
	});

	const lists =
		subscribed !== "free"
			? [...(bsky?.lists ?? []), ...(mastodon?.lists ?? [])]
			: [];

	return {
		links,
		key: uuidv7(),
		instance: mastodon?.mastodonInstance?.instance,
		bsky: bsky?.handle,
		lists,
		bookmarks,
		subscribed,
	};
};

const Links = ({ loaderData }: Route.ComponentProps) => {
	const [searchParams] = useSearchParams();
	const page = Number.parseInt(searchParams.get("page") || "1");
	const [nextPage, setNextPage] = useState(page + 1);
	const [observer, setObserver] = useState<IntersectionObserver | null>(null);
	const [fetchedLinks, setFetchedLinks] = useState<MostRecentLinkPosts[]>([]);
	const [key, setKey] = useState(loaderData.key);
	const fetcher = useFetcher<typeof loader>();
	const formRef = useRef<HTMLFormElement>(null);
	const navigation = useNavigation();
	const location = useLocation();

	// Pending state for any in-flight filter navigation on this page — covers
	// the search box, the sort/service/list filters, and the minShares input.
	// Matches when React Router is loading a navigation destined for the same
	// pathname but with a different query string (so it doesn't trigger on
	// fresh page mounts or on cross-route nav).
	const isPending =
		navigation.state === "loading" &&
		navigation.location?.pathname === location.pathname &&
		(navigation.location.search ?? "") !== (location.search ?? "");

	// Defer the visible pending UI by 50 ms so cached/fast navigations don't
	// produce a flicker. If the navigation resolves before the timer fires,
	// `showPending` stays false and the user sees no transition; turning off
	// is immediate so the spinner doesn't linger after results arrive.
	const [showPending, setShowPending] = useState(false);
	useEffect(() => {
		if (!isPending) {
			setShowPending(false);
			return;
		}
		const t = setTimeout(() => setShowPending(true), 50);
		return () => clearTimeout(t);
	}, [isPending]);

	// The fresh search param being navigated to — used to tell a query update
	// apart from a sort/service swap when we want a "Searching for X…" label.
	const pendingQuery = showPending
		? (new URLSearchParams(navigation.location?.search ?? "").get("query") ?? "")
		: "";

	function setupIntersectionObserver() {
		const $form = formRef.current;
		if (!$form) return;
		const debouncedSubmit = debounce(submitForm, 1000, {
			isImmediate: true,
		});
		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				debouncedSubmit();
				observer.unobserve($form);
			}
		});
		observer.observe($form);
		setObserver(observer);
	}

	function submitForm() {
		const $form = formRef.current;
		if (!$form) return;
		fetcher.submit($form, { preventScrollReset: true });
		setNextPage(nextPage + 1);
	}

	const debouncedObserver = debounce(setupIntersectionObserver, 100, {
		isImmediate: true,
	});

	// Setup intersection observer after promise is resolved
	useEffect(() => {
		loaderData.links.then(() => {
			if (!observer) {
				setTimeout(debouncedObserver, 100);
			}
		});
	});

	// When the fetcher has returned new links, set the state and reset the observer
	// biome-ignore lint/correctness/useExhaustiveDependencies: Can't put setupIntersectionObserver in the dependency array
	useEffect(() => {
		if (fetcher.state === "idle" && fetcher.data?.links) {
			fetcher.data.links.then((links) => {
				if (links.length > 0) {
					setFetchedLinks(fetchedLinks.concat(links));
					setupIntersectionObserver();
				}
			});
		}
	}, [fetcher, fetchedLinks.concat]);

	// A new key signifies the server loader got new data. Clear the pagination state.
	useEffect(() => {
		if (key !== loaderData.key) {
			setKey(loaderData.key);
			setFetchedLinks([]);
		}
	}, [key, loaderData.key]);

	const layout = useLayout();
	// Hide just-muted cards immediately, before the server feed converges.
	const { isMuted } = useOptimisticMutes();

	return (
		<Layout
			sidebar={
				<LinkFilters
					showService={!!(loaderData.bsky && loaderData.instance)}
					lists={loaderData.lists}
				/>
			}
		>
			<SortPresetList />
			<LinkFiltersCollapsible>
				<LinkFilters
					showService={!!(loaderData.bsky && loaderData.instance)}
					lists={loaderData.lists}
					reverse={true}
					hideSort={true}
				/>
			</LinkFiltersCollapsible>
			<Box position="relative">
				{/* Floating overlay indicator. `position: fixed` takes the pill
				    completely out of document flow so toggling it never shifts
				    the cards below — sticky still claims its initial flow slot
				    before pinning, which produced the residual nudge. Fixed
				    also keeps the indicator pinned to the viewport so it stays
				    visible no matter how far down the user has scrolled. */}
				{showPending && (
					<Box
						aria-live="polite"
						style={{
							position: "fixed",
							top: 16,
							left: "50%",
							transform: "translateX(-50%)",
							zIndex: 50,
							pointerEvents: "none",
						}}
					>
						<Card
							variant="surface"
							size="1"
							style={{ pointerEvents: "auto" }}
						>
							<Flex gap="2" align="center" px="2">
								<Spinner size="2" />
								<Text size="2" color="gray">
									{pendingQuery
										? `Searching for “${pendingQuery}”…`
										: "Updating results…"}
								</Text>
							</Flex>
						</Card>
					</Box>
				)}
			<Suspense
				fallback={
					<Box>
						<Flex justify="center">
							<Spinner size="3" />
						</Flex>
					</Box>
				}
			>
				<Await
					resolve={loaderData.links}
					errorElement={
						<Box>
							<Text as="p">
								Failed to fetch new links. Try refreshing the page.
							</Text>
						</Box>
					}
				>
					{(links) => (
						<Box
							aria-busy={showPending}
							style={{
								opacity: showPending ? 0.55 : 1,
								transition: "opacity 150ms ease",
								pointerEvents: showPending ? "none" : "auto",
							}}
						>
							{links
								.filter((link) => !isMuted(link))
								.map((link) => (
									// Include the loader key so cards remount when the feed
									// reloads (e.g. filtering to a list), discarding any posts
									// hydrated for a URL under the previous filters.
									<div key={`${loaderData.key}:${link.link?.url}`}>
										<LinkPost
											linkPost={link}
											instance={loaderData.instance}
											bsky={loaderData.bsky}
											layout={layout}
											bookmarks={loaderData.bookmarks}
											subscribed={loaderData.subscribed}
										/>
									</div>
								))}
							{fetchedLinks.length > 0 && (
								<div>
									{fetchedLinks
										.filter((link) => !isMuted(link))
										.map((link) => (
											<LinkPost
												key={link.link?.url}
												linkPost={link}
												instance={loaderData.instance}
												bsky={loaderData.bsky}
												layout={layout}
												bookmarks={loaderData.bookmarks}
												subscribed={loaderData.subscribed}
											/>
										))}
								</div>
							)}
							<Box position="absolute" top="90%">
								<fetcher.Form method="GET" preventScrollReset ref={formRef}>
									<input type="hidden" name="page" value={nextPage} />
									{[...searchParams.entries()].map(([key, value]) => (
										<input key={key} type="hidden" name={key} value={value} />
									))}
								</fetcher.Form>
							</Box>
						</Box>
					)}
				</Await>
			</Suspense>
			</Box>
		</Layout>
	);
};

export const LinkPost = ({
	linkPost,
	instance,
	bsky,
	layout,
	bookmarks,
	subscribed,
}: {
	linkPost: MostRecentLinkPosts;
	instance: string | undefined;
	bsky: string | undefined;
	layout: "dense" | "default";
	bookmarks: BookmarkWithLinkPosts[];
	subscribed: SubscriptionStatus;
}) => {
	const location = useLocation();
	return (
		<div>
			<LinkPostRep
				linkPost={linkPost}
				instance={instance}
				bsky={bsky}
				layout={layout}
				autoExpand={location.hash.substring(1) === linkPost.link?.id}
				bookmarks={bookmarks}
				subscribed={subscribed}
			/>
			{layout === "default" ? (
				<Separator my="7" size="4" orientation="horizontal" />
			) : (
				<Box my="5" />
			)}
		</div>
	);
};

export default Links;
