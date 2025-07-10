import { db } from "~/drizzle/db.server";
import {
	blueskyAccount,
	bookmark,
	mastodonAccount,
} from "~/drizzle/schema.server";
import { isSubscribed, requireUserId } from "~/utils/auth.server";
import type { Route } from "./+types";
import { and, desc, eq, or, sql } from "drizzle-orm";
import Layout from "~/components/nav/Layout";
import { LinkPost } from "~/routes/links";
import { Form, redirect, useFetcher, useSearchParams } from "react-router";
import PageHeading from "~/components/nav/PageHeading";
import {
	Box,
	Callout,
	Card,
	Heading,
	IconButton,
	Link,
	Text,
} from "@radix-ui/themes";
import { CircleAlert, Bookmark } from "lucide-react";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import SearchField from "~/components/forms/SearchField";
import { useLayout } from "../resources/layout-switch";
import { useEffect, useRef, useState } from "react";
import { uuidv7 } from "uuidv7-js";
import { debounce } from "ts-debounce";
import SubscriptionCallout from "~/components/subscription/SubscriptionCallout";
export const meta: Route.MetaFunction = () => [{ title: "Sill | Bookmarks" }];

type BookmarkWithLinkPosts = typeof bookmark.$inferSelect & {
	linkPosts?: MostRecentLinkPosts;
};

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request);

	if (!userId) {
		return redirect("/accounts/login") as never;
	}

	const subscribed = await isSubscribed(userId);

	if (subscribed === "free") {
		return redirect("/settings/subscription") as never;
	}

	const bsky = await db.query.blueskyAccount.findFirst({
		where: eq(blueskyAccount.userId, userId),
	});

	const mastodon = await db.query.mastodonAccount.findFirst({
		where: eq(mastodonAccount.userId, userId),
		with: {
			mastodonInstance: {
				columns: {
					instance: true,
				},
			},
			lists: true,
		},
	});

	const url = new URL(request.url);
	const query = url.searchParams.get("query");
	const page = url.searchParams.get("page") || "1";

	const bookmarks: BookmarkWithLinkPosts[] = await db.query.bookmark.findMany({
		where: and(
			eq(bookmark.userId, userId),
			query
				? or(
						sql`${bookmark.linkUrl} ILIKE ${`%${query}%`}`,
						sql`${bookmark.posts}::jsonb->>'link.title' ILIKE ${`%${query}%`}`,
						sql`${bookmark.posts}::jsonb->>'link.description' ILIKE ${`%${query}%`}`,
					)
				: undefined,
		),
		orderBy: desc(bookmark.createdAt),
		limit: 10,
		offset: (Number.parseInt(page) - 1) * 10,
	});

	for (const bookmark of bookmarks) {
		if (!bookmark.posts.posts) {
			continue;
		}
		for (const post of bookmark.posts.posts) {
			post.postDate = new Date(post.postDate);
			post.quotedPostDate =
				post.quotedPostDate && new Date(post.quotedPostDate);
		}
	}

	return {
		bookmarks,
		subscribed,
		bsky: bsky?.handle,
		instance: mastodon?.mastodonInstance.instance,
		key: uuidv7(),
	};
}

export default function BookmarksPage({ loaderData }: Route.ComponentProps) {
	const { bookmarks, subscribed, bsky, instance } = loaderData;
	const layout = useLayout();

	const [searchParams] = useSearchParams();
	const page = Number.parseInt(searchParams.get("page") || "1");
	const [nextPage, setNextPage] = useState(page + 1);
	const [observer, setObserver] = useState<IntersectionObserver | null>(null);
	const [fetchedBookmarks, setFetchedBookmarks] =
		useState<BookmarkWithLinkPosts[]>(bookmarks);
	const [key, setKey] = useState(loaderData.key);
	const fetcher = useFetcher<typeof loader>();
	const formRef = useRef<HTMLFormElement>(null);

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
		if (!observer) {
			setTimeout(debouncedObserver, 100);
		}
	});

	// When the fetcher has returned new links, set the state and reset the observer
	// biome-ignore lint/correctness/useExhaustiveDependencies: Can't put setupIntersectionObserver in the dependency array
	useEffect(() => {
		if (fetcher.state === "idle" && fetcher.data?.bookmarks) {
			if (fetcher.data.bookmarks.length > 0) {
				setFetchedBookmarks(fetchedBookmarks.concat(fetcher.data.bookmarks));
				setupIntersectionObserver();
			}
		}
	}, [fetcher, fetchedBookmarks.concat]);

	// A new key signifies the server loader got new data. Clear the pagination state.
	useEffect(() => {
		if (key !== loaderData.key) {
			setKey(loaderData.key);
		}
	}, [key, loaderData.key]);

	const groupedBookmarks = fetchedBookmarks.reduce(
		(groups, bookmark) => {
			const date = new Date(bookmark.createdAt).toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			});

			if (!groups[date]) {
				groups[date] = [];
			}

			groups[date].push(bookmark);
			return groups;
		},
		{} as Record<string, typeof bookmarks>,
	);

	const bookmarksByDate = Object.entries(groupedBookmarks);

	return (
		<Layout>
			<PageHeading
				title="Bookmarks"
				dek="Sill can save links you bookmark for easy access later. If you bookmark a link, Sill will track all posts sharing that link for you."
			/>
			{subscribed === "trial" && (
				<SubscriptionCallout featureName="Bookmarks" />
			)}
			<Box mb="6" key="search">
				<Form method="GET">
					<SearchField />
				</Form>
			</Box>
			<Box my="4">
				{bookmarksByDate.length > 0 ? (
					bookmarksByDate.map(([date, dateBookmarks]) => (
						<Box key={date} mb="6">
							<Heading as="h3" size="4" mb="3">
								{date}
							</Heading>
							{dateBookmarks.map((bookmark) => (
								<LinkPost
									key={bookmark.id}
									linkPost={bookmark.posts}
									instance={instance}
									bsky={bsky}
									layout={layout}
									bookmarks={bookmarks}
								/>
							))}
						</Box>
					))
				) : (
					<Card>
						<Text as="p" mb="4">
							You haven't bookmarked any links yet.
						</Text>
						<Text as="p">
							Bookmark posts using the bookmark icon{" "}
							<IconButton variant="ghost" size="1">
								<Bookmark />
							</IconButton>{" "}
							on links <Link href="/links">in your feed</Link>.
						</Text>
					</Card>
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
		</Layout>
	);
}
