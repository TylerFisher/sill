import { Box, Card, Flex, Separator, Spinner, Text } from "@radix-ui/themes";
import type { SubscriptionStatus } from "@sill/schema";
import type { MostRecentLinkPosts } from "@sill/schema";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
	Await,
	useFetcher,
	useLocation,
	useNavigation,
	useRevalidator,
	useSearchParams,
} from "react-router";
import { redirect } from "react-router";
import { debounce } from "ts-debounce";
import { uuidv7 } from "uuidv7-js";
import LinkFilters from "~/components/forms/LinkFilters";
import LinkFiltersCollapsible from "~/components/forms/LinkFiltersCollapsible";
import SortPresetList from "~/components/forms/SortPresetList";
import LinkPostRep from "~/components/linkPosts/LinkPostRep";
import {
	SourceBadgeProvider,
	buildSourceBadgeValue,
} from "~/components/linkPosts/SourceBadge";
import Layout from "~/components/nav/Layout";
import { useFilterStorage } from "~/hooks/useFilterStorage";
import { useOptimisticMutes } from "~/hooks/useOptimisticMutes";
import { useLayout } from "~/routes/resources/layout-switch";
import {
	apiCheckBlueskyStatus,
	apiFilterLinkOccurrences,
} from "~/utils/api-client.server";
import { requireUserFromContext } from "~/utils/context.server";
import { timeParamToMs } from "~/utils/timeRange";
import type { BookmarkWithLinkPosts } from "../bookmarks";
import type { Route } from "./+types/index";
import styles from "./index.module.css";

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
	} else if (
		repostsParam &&
		["include", "exclude", "only"].includes(repostsParam)
	) {
		hideReposts = repostsParam as "include" | "exclude" | "only";
	}

	// Redirect to update the URL with the new parameter value
	if (needsRedirect) {
		const newUrl = new URL(request.url);
		newUrl.searchParams.set("reposts", hideReposts);
		throw redirect(newUrl.toString());
	}

	const serviceParam = ["mastodon", "bluesky", "all"].includes(
		url.searchParams.get("service") || "",
	)
		? (url.searchParams.get("service") as "mastodon" | "bluesky" | "all")
		: "all";
	// Coerce a service filter that points at a disconnected account (e.g. a saved
	// `service=mastodon` after the user disconnects Mastodon) to "all", so a stale
	// preference can't leave the feed permanently empty. The client also clears
	// the stale param/pref (see the component) so the URL heals too.
	const service =
		(serviceParam === "mastodon" && !mastodon) ||
		(serviceParam === "bluesky" && !bsky)
			? "all"
			: serviceParam;

	const options = {
		hideReposts,
		sort: url.searchParams.get("sort") || "popularity",
		query: url.searchParams.get("query") || undefined,
		service,
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

// How often the seeding state re-checks the feed while the AppView seed warms.
const SEEDING_POLL_MS = 5000;

/**
 * Shown when the AppView reports the viewer as `cold`: their network seed is
 * still warming after onboarding, so the feed is empty for now. We revalidate
 * every 5s so links appear on their own once the seed warms (the server caps
 * the cold cache at a few seconds, so each poll re-probes the AppView). When
 * `cold` clears, this unmounts and the interval is torn down.
 */
const SeedingState = () => {
	const revalidator = useRevalidator();
	// Hold the latest revalidate in a ref so the interval effect can run once
	// (empty deps) without capturing a stale closure.
	const revalidate = useRef(revalidator.revalidate);
	revalidate.current = revalidator.revalidate;

	useEffect(() => {
		const id = setInterval(() => revalidate.current(), SEEDING_POLL_MS);
		return () => clearInterval(id);
	}, []);

	return (
		<Card mt="4">
			<Flex
				className={styles.seeding}
				direction="column"
				align="center"
				gap="5"
				px="4"
			>
				<span className={styles.beacon} aria-hidden="true" />
				<Flex direction="column" align="center" gap="2">
					<Text as="p" size="3" weight="bold">
						Gathering your network
					</Text>
					<Text as="p" size="2" color="gray" align="center">
						Sill is collecting the links the people you follow are sharing. This
						takes a minute. New links appear here on their own.
					</Text>
				</Flex>
			</Flex>
		</Card>
	);
};

/**
 * The shared calm-notice surface for the feed's resting states (empty, error).
 * THE VOID — a quiet, centered card that holds the same stillness as the
 * seeding state, so an empty or failed feed still reads as the same room.
 * EGOLESS — plain language and no illustration; it says what is true and steps
 * back. A title alone is enough; the body is optional.
 */
const FeedNotice = ({
	title,
	children,
}: {
	title: string;
	children?: React.ReactNode;
}) => (
	<Card mt="4">
		<Flex
			className={styles.notice}
			direction="column"
			align="center"
			gap="2"
			px="4"
		>
			<Text as="p" size="3" weight="bold">
				{title}
			</Text>
			{children && (
				<Text
					as="p"
					size="2"
					color="gray"
					align="center"
					// COMFORTABLE — hold the body to a readable measure instead of
					// letting it stretch across the full card width.
					style={{ maxWidth: "38ch" }}
				>
					{children}
				</Text>
			)}
		</Flex>
	</Card>
);

/**
 * Shown when the feed resolves with nothing to show and the viewer is warm (so
 * it is genuinely empty, not still seeding). The copy answers the most likely
 * cause: a search with no matches, or filters narrowed past what the network
 * shared in this window.
 */
const EmptyState = ({ query }: { query: string | null }) =>
	query ? (
		<FeedNotice title="No links match your search">
			Nothing your network shared matches “{query}”. Try a different search or
			clear it to see everything.
		</FeedNotice>
	) : (
		<FeedNotice title="Nothing here right now">
			Your network has not shared any links that fit these filters. Try a longer
			time range or fewer filters.
		</FeedNotice>
	);

const Links = ({ loaderData }: Route.ComponentProps) => {
	const [searchParams, setSearchParams] = useSearchParams();
	const { clearFilterFromStorage } = useFilterStorage();
	const page = Number.parseInt(searchParams.get("page") || "1");
	const [nextPage, setNextPage] = useState(page + 1);
	const [observer, setObserver] = useState<IntersectionObserver | null>(null);
	const [fetchedLinks, setFetchedLinks] = useState<MostRecentLinkPosts[]>([]);
	const [key, setKey] = useState(loaderData.key);
	const fetcher = useFetcher<typeof loader>();
	const formRef = useRef<HTMLFormElement>(null);
	const navigation = useNavigation();
	const location = useLocation();

	// Heal a stale `service` filter that targets a disconnected account. Such a
	// saved pref (e.g. `service=mastodon` after disconnecting Mastodon) keeps
	// getting re-applied and empties the feed, and the service toggle is hidden
	// unless both networks are connected — so the user can't clear it themselves.
	// Drop it from the URL and saved prefs; the loader also coerces it to "all"
	// for the query so the feed isn't empty in the meantime.
	useEffect(() => {
		const service = searchParams.get("service");
		const stale =
			(service === "mastodon" && !loaderData.instance) ||
			(service === "bluesky" && !loaderData.bsky);
		if (!stale) return;
		clearFilterFromStorage("service");
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.delete("service");
				return next;
			},
			{ replace: true },
		);
	}, [
		searchParams,
		loaderData.instance,
		loaderData.bsky,
		clearFilterFromStorage,
		setSearchParams,
	]);

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
		? (new URLSearchParams(navigation.location?.search ?? "").get("query") ??
			"")
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
			fetcher.data.links.then((data) => {
				if (data.links.length > 0) {
					setFetchedLinks(fetchedLinks.concat(data.links));
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

	// Source-badge config: map the viewer's feeds/lists to their canonical
	// sourceIds + names, and the currently-filtered list so its badge is hidden.
	const sourceBadge = useMemo(
		() =>
			buildSourceBadgeValue(
				loaderData.lists,
				loaderData.instance,
				searchParams.get("list"),
			),
		[loaderData.lists, loaderData.instance, searchParams],
	);

	return (
		<SourceBadgeProvider value={sourceBadge}>
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
							<Flex className={styles.loading} justify="center">
								<Spinner size="3" />
							</Flex>
						}
					>
						<Await
							resolve={loaderData.links}
							errorElement={
								<FeedNotice title="The feed could not load">
									Something went wrong fetching your links. Refresh the page to
									try again.
								</FeedNotice>
							}
						>
							{(data) => {
								const visibleLinks = data.links.filter(
									(link) => !isMuted(link),
								);
								if (data.cold && visibleLinks.length === 0) {
									return <SeedingState />;
								}
								// THE VOID — a warm viewer with nothing to show gets a calm,
								// meaningful center instead of a blank page. Guard on the
								// paged-in links too, so muting the whole first page mid-scroll
								// doesn't flip a populated feed to "empty".
								if (visibleLinks.length === 0 && fetchedLinks.length === 0) {
									return <EmptyState query={searchParams.get("query")} />;
								}
								return (
									<Box
										aria-busy={showPending}
										style={{
											// FREE — a refresh dims the feed a touch so the floating
											// indicator reads, but it never locks the page. The reader
											// keeps scrolling and reading the current links while the
											// next set loads; the pointer is not trapped and the fade
											// is gentle. Echoes the app's shared easing curve.
											opacity: showPending ? 0.72 : 1,
											transition: "opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)",
										}}
									>
										{visibleLinks.map((link, i) => (
											// Include the loader key so cards remount when the feed
											// reloads (e.g. filtering to a list), discarding any posts
											// hydrated for a URL under the previous filters. The remount
											// also replays the settle entrance, so the feed visibly
											// arrives again each time it responds to a filter (alive).
											<div
												key={`${loaderData.key}:${link.link?.url}`}
												className={styles.settle}
												// Cap the stagger so a long feed still finishes
												// settling within a beat (exact).
												style={
													{
														"--settle-index": Math.min(i, 12),
													} as React.CSSProperties
												}
											>
												<LinkPost
													linkPost={link}
													instance={loaderData.instance}
													bsky={loaderData.bsky}
													layout={layout}
													bookmarks={loaderData.bookmarks}
													subscribed={loaderData.subscribed}
													trailing="space"
												/>
											</div>
										))}
										{fetchedLinks.length > 0 && (
											<div>
												{fetchedLinks
													.filter((link) => !isMuted(link))
													.map((link, i) => (
														// Newly paged-in links settle in too, so an appended
														// page reads as the feed continuing to arrive rather
														// than blinking into existence (alive). A short stagger
														// keeps the scroll responsive.
														<div
															key={link.link?.url}
															className={styles.settle}
															style={
																{
																	"--settle-index": Math.min(i, 6),
																} as React.CSSProperties
															}
														>
															<LinkPost
																linkPost={link}
																instance={loaderData.instance}
																bsky={loaderData.bsky}
																layout={layout}
																bookmarks={loaderData.bookmarks}
																subscribed={loaderData.subscribed}
																trailing="space"
															/>
														</div>
													))}
											</div>
										)}
										<Box position="absolute" top="90%">
											<fetcher.Form
												method="GET"
												preventScrollReset
												ref={formRef}
											>
												<input type="hidden" name="page" value={nextPage} />
												{[...searchParams.entries()].map(([key, value]) => (
													<input
														key={key}
														type="hidden"
														name={key}
														value={value}
													/>
												))}
											</fetcher.Form>
										</Box>
									</Box>
								);
							}}
						</Await>
					</Suspense>
				</Box>
			</Layout>
		</SourceBadgeProvider>
	);
};

export const LinkPost = ({
	linkPost,
	instance,
	bsky,
	layout,
	bookmarks,
	subscribed,
	trailing = "rule",
}: {
	linkPost: MostRecentLinkPosts;
	instance: string | undefined;
	bsky: string | undefined;
	layout: "dense" | "default";
	bookmarks: BookmarkWithLinkPosts[];
	subscribed: SubscriptionStatus;
	// WHOLE — in the default layout each link is already a bounded card, so the
	// shadow is its boundary. A full-width rule between cards is a second
	// boundary stacked on the first, and it chops the feed into slabs. "space"
	// drops the rule for quiet positive space, letting the feed read as one
	// calm field. The main feed opts in; other surfaces keep the rule ("rule"
	// default) so their look is unchanged. Dense has no card, so it always
	// keeps its thin separating space regardless.
	trailing?: "rule" | "space";
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
				trailing === "space" ? (
					<Box my="6" />
				) : (
					<Separator my="7" size="4" orientation="horizontal" />
				)
			) : (
				<Box my="5" />
			)}
		</div>
	);
};

export default Links;
