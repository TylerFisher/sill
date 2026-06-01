import { Box, Flex, Spinner } from "@radix-ui/themes";
import type {
	MostRecentLinkPosts,
	SubscriptionStatus,
	bookmark,
} from "@sill/schema";
import { useEffect, useRef, useState } from "react";
import { useFetcher, useLocation } from "react-router";
import LinksList from "./LinksList";

interface PaginatedLinksListProps {
	links: MostRecentLinkPosts[];
	/** The AppView cursor for the next page; absent on the last page. */
	cursor?: string;
	instance: string | undefined;
	bsky: string | undefined;
	bookmarks: (typeof bookmark.$inferSelect)[];
	subscribed: SubscriptionStatus;
}

/**
 * What the route loader returns when paginating. The first page is streamed
 * (the loader leaves `result` a promise), but cursor requests are awaited
 * server-side, so the paginating fetcher receives a resolved `result`.
 */
type Page = { links: MostRecentLinkPosts[]; cursor?: string };
type LoaderData = { result: Page };

/**
 * Cursor-based infinite scroll over a `LinksList`, mirroring the main feed:
 * a sentinel near the bottom loads the next page (the current route URL with
 * `?cursor=…`) via a fetcher and appends it. Stops when the API returns no
 * cursor. Used by the by-author and by-domain pages.
 */
const PaginatedLinksList = ({
	links,
	cursor,
	instance,
	bsky,
	bookmarks,
	subscribed,
}: PaginatedLinksListProps) => {
	const location = useLocation();
	const fetcher = useFetcher<LoaderData>();
	const [extra, setExtra] = useState<MostRecentLinkPosts[]>([]);
	const [nextCursor, setNextCursor] = useState<string | undefined>(cursor);
	const loadingRef = useRef(false);
	const sentinelRef = useRef<HTMLDivElement>(null);
	// Identity of the loader's initial page; a change means the route reloaded
	// (navigated to a new author/domain, or revalidated) — discard accumulated
	// pages and restart from the fresh first page.
	const initialRef = useRef(links);

	useEffect(() => {
		if (initialRef.current !== links) {
			initialRef.current = links;
			setExtra([]);
			setNextCursor(cursor);
			loadingRef.current = false;
		}
	}, [links, cursor]);

	// Append each fetched page and advance the cursor.
	useEffect(() => {
		if (
			fetcher.state === "idle" &&
			fetcher.data?.result &&
			loadingRef.current
		) {
			loadingRef.current = false;
			const page = fetcher.data.result;
			setExtra((prev) => prev.concat(page.links));
			setNextCursor(page.cursor);
		}
	}, [fetcher.state, fetcher.data]);

	// Load the next page when the sentinel scrolls into view.
	// biome-ignore lint/correctness/useExhaustiveDependencies: location/fetcher are stable for our use; re-running on cursor change is what drives pagination
	useEffect(() => {
		const el = sentinelRef.current;
		if (!el || !nextCursor) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && !loadingRef.current) {
					loadingRef.current = true;
					const params = new URLSearchParams(location.search);
					params.set("cursor", nextCursor);
					fetcher.load(`${location.pathname}?${params.toString()}`);
				}
			},
			{ rootMargin: "600px" },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [nextCursor]);

	const allLinks = links.concat(extra);

	return (
		<>
			<LinksList
				links={allLinks}
				instance={instance}
				bsky={bsky}
				bookmarks={bookmarks}
				subscribed={subscribed}
			/>
			{nextCursor && (
				<Box ref={sentinelRef} py="6">
					<Flex justify="center">
						<Spinner size="3" />
					</Flex>
				</Box>
			)}
		</>
	);
};

export default PaginatedLinksList;
