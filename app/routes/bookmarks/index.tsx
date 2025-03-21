import { db } from "~/drizzle/db.server";
import {
	blueskyAccount,
	bookmark,
	mastodonAccount,
} from "~/drizzle/schema.server";
import { isSubscribed, requireUserId } from "~/utils/auth.server";
import type { Route } from "./+types";
import { desc, eq } from "drizzle-orm";
import Layout from "~/components/nav/Layout";
import { LinkPost } from "~/routes/links";
import { Form, redirect } from "react-router";
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

	let bookmarks: BookmarkWithLinkPosts[] = await db.query.bookmark.findMany({
		where: eq(bookmark.userId, userId),
		orderBy: desc(bookmark.createdAt),
	});

	if (query) {
		// Filter bookmarks based on the query string
		bookmarks = bookmarks.filter((bookmark) => {
			// Check if the link URL contains the query
			if (bookmark.linkUrl.toLowerCase().includes(query.toLowerCase())) {
				return true;
			}

			// Check if the posts object contains title or description that matches the query
			if (
				bookmark.posts.link?.title
					?.toLowerCase()
					.includes(query.toLowerCase()) ||
				bookmark.posts.link?.description
					?.toLowerCase()
					.includes(query.toLowerCase())
			) {
				return true;
			}

			return false;
		});
	}

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
	};
}

export default function BookmarksPage({ loaderData }: Route.ComponentProps) {
	const { bookmarks, subscribed, bsky, instance } = loaderData;
	const layout = useLayout();

	const groupedBookmarks = bookmarks.reduce(
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
			<PageHeading title="Bookmarks" />
			{subscribed === "trial" && (
				<Callout.Root mb="4">
					<Callout.Icon>
						<CircleAlert width="18" height="18" />
					</Callout.Icon>
					<Callout.Text size="2">
						Daily Digests are part of Sill+.{" "}
						<Link href="/settings/subscription">Subscribe now</Link> to maintain
						access.
					</Callout.Text>
				</Callout.Root>
			)}
			<Box my="4">
				<Box mb="6">
					<Form method="GET">
						<SearchField />
					</Form>
				</Box>
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
			</Box>
		</Layout>
	);
}
