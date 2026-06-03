/**
 * Dev-only RSS test feed. Serves one entry per share type Sill renders, so the
 * digest RSS markup (per-type "View … on …" footer, post body, no footer for
 * scrobbles/bookmarks) can be checked in a real RSS reader. Each item is
 * rendered through the same `RSSNotificationItem` the notification feed uses.
 *
 * Point your reader at: http://localhost:3000/rss-test
 *
 * Mirrors the fixtures in `apps/worker/src/send-test-notification.ts`.
 * Returns 404 in production.
 */

import type {
	MostRecentLinkPosts,
	RenderedLink,
	RenderedLinkPost,
} from "@sill/schema";
import { Feed } from "feed";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RSSNotificationItem from "~/components/rss/RSSNotificationItem";

const AVATAR = "https://avatar.vercel.sh/jane.png";

let seq = 0;
const id = () => `00000000-0000-0000-0000-${String(++seq).padStart(12, "0")}`;

const makeLink = (overrides: Partial<RenderedLink>): RenderedLink => ({
	id: id(),
	url: "https://example.com/article",
	title: "An example article",
	description: "A representative link card for the test feed.",
	imageUrl: null,
	giftUrl: null,
	metadata: null,
	scraped: true,
	publishedDate: null,
	authors: ["Jane Author"],
	siteName: "Example",
	topics: null,
	publisherIcon: null,
	...overrides,
});

const makePost = (overrides: Partial<RenderedLinkPost>): RenderedLinkPost => ({
	id: id(),
	linkUrl: "https://example.com/article",
	postUrl: "https://bsky.app/profile/jane.test",
	postText: "",
	postDate: new Date().toISOString(),
	postType: "bluesky",
	postImages: null,
	actorUrl: "https://bsky.app/profile/jane.test",
	actorHandle: "jane.test",
	actorName: "Jane Tester",
	actorAvatarUrl: AVATAR,
	quotedActorUrl: null,
	quotedActorHandle: null,
	quotedActorName: null,
	quotedActorAvatarUrl: null,
	quotedPostUrl: null,
	quotedPostText: null,
	quotedPostDate: null,
	quotedPostType: null,
	quotedPostImages: null,
	repostActorUrl: null,
	repostActorHandle: null,
	repostActorName: null,
	repostActorAvatarUrl: null,
	userId: id(),
	listId: null,
	collection: "app.bsky.feed.post",
	sources: null,
	parent: null,
	...overrides,
});

const card = (
	title: string,
	url: string,
	post: RenderedLinkPost,
): MostRecentLinkPosts => ({
	uniqueActorsCount: 1,
	link: makeLink({ title, url }),
	posts: [{ ...post, linkUrl: url }],
	avatars: [AVATAR],
});

const links: MostRecentLinkPosts[] = [
	card(
		"Bluesky · a normal post",
		"https://example.com/bluesky",
		makePost({
			postType: "bluesky",
			collection: "app.bsky.feed.post",
			postUrl: "https://bsky.app/profile/jane.test/post/3ktestpost",
			postText: "This piece is worth your time.",
		}),
	),
	card(
		"Bluesky · a quote post",
		"https://example.com/bluesky-quote",
		makePost({
			postType: "bluesky",
			collection: "app.bsky.feed.post",
			postUrl: "https://bsky.app/profile/jane.test/post/3ktestquote",
			postText: "Quoting this take:",
			quotedPostType: "bluesky",
			quotedPostUrl: "https://bsky.app/profile/sam.test/post/3ktestquoted",
			quotedPostText: "The original hot take being quoted.",
			quotedActorUrl: "https://bsky.app/profile/sam.test",
			quotedActorHandle: "sam.test",
			quotedActorName: "Sam Source",
			quotedActorAvatarUrl: AVATAR,
		}),
	),
	card(
		"Mastodon · a status",
		"https://example.com/mastodon",
		makePost({
			postType: "mastodon",
			collection: "mastodon.status",
			postUrl: "https://mastodon.social/@jane/110000000000000001",
			postText: "<p>Sharing this over on Mastodon.</p>",
			actorUrl: "https://mastodon.social/@jane",
			actorHandle: "jane@mastodon.social",
		}),
	),
	card(
		"Semble · a bookmark (card)",
		"https://example.com/semble",
		makePost({
			postType: "atbookmark",
			collection: "network.cosmik.card",
			postUrl:
				"https://semble.so/url?id=https://example.com/semble&sembleTab=addedBy",
			postText:
				'Bookmarked this on <a href="https://semble.so/url?id=https://example.com/semble&sembleTab=addedBy">Semble</a>.',
			actorUrl: "https://semble.so/profile/jane.test",
		}),
	),
	card(
		"Sill · a bookmark (no footer link)",
		"https://example.com/sill-bookmark",
		makePost({
			postType: "atbookmark",
			collection: "community.lexicon.bookmarks.bookmark",
			postUrl: "https://bsky.app/profile/jane.test",
			postText: '<span class="sill-bookmark">Bookmarked this URL.</span>',
		}),
	),
	card(
		"Rocksky · a scrobble (no footer link)",
		"https://example.com/rocksky",
		makePost({
			postType: "atbookmark",
			collection: "app.rocksky.scrobble",
			postUrl:
				"https://rocksky.app/did%3Aplc%3Atestlistener/scrobble/3ktestscrobble",
			postText:
				'<div class="scrobble-card"><div>Listened to <a href="https://open.spotify.com/track/test"><strong>Test Track</strong></a> by Test Artist</div><div>Test Album · 2024 · Indie</div></div>',
			actorUrl: "https://rocksky.app/did%3Aplc%3Atestlistener",
		}),
	),
	card(
		"Leaflet · a document",
		"https://example.com/leaflet",
		makePost({
			postType: "atbookmark",
			collection: "pub.leaflet.content",
			postUrl: "https://blog.leaflet.pub/my-post",
			postText:
				'<p class="leaflet-source">Linked to this in <a href="https://blog.leaflet.pub/my-post">My Leaflet Post</a> on Leaflet.</p>',
		}),
	),
	card(
		"Offprint · a document",
		"https://example.com/offprint",
		makePost({
			postType: "atbookmark",
			collection: "app.offprint.content",
			postUrl: "https://offprint.net/my-essay",
			postText:
				'<p class="offprint-source">Linked to this in <a href="https://offprint.net/my-essay">My Offprint Essay</a> on Offprint.</p>',
		}),
	),
	card(
		"Pckt · a document",
		"https://example.com/pckt",
		makePost({
			postType: "atbookmark",
			collection: "blog.pckt.content",
			postUrl: "https://my.pckt.blog/my-note",
			postText:
				'<p class="pckt-source">Linked to this in <a href="https://my.pckt.blog/my-note">My Pckt Note</a> on Pckt.</p>',
		}),
	),
];

// Self-typed (not via generated `./+types`) so the file typechecks while the
// route is commented out of routes.ts. Re-register the route to use it.
export const loader = ({ request }: { request: Request }) => {
	// Dev-only: this serves synthetic data, not a real user's feed.
	if (process.env.NODE_ENV === "production") {
		throw new Response("Not found", { status: 404 });
	}

	const baseUrl = new URL(request.url).origin;
	const feed = new Feed({
		title: "Sill RSS test — all share types",
		description: "Synthetic feed exercising every share type Sill renders.",
		id: `${baseUrl}/rss-test`,
		link: `${baseUrl}/rss-test`,
		image: "https://sill.social/favicon-96x96.png",
		favicon: "https://sill.social/favicon-96x96.png",
		copyright: "",
		updated: new Date(),
		generator: "Sill",
		feedLinks: { rss: `${baseUrl}/rss-test` },
	});

	for (const linkPost of links) {
		if (!linkPost.link) continue;
		const html = renderToStaticMarkup(
			createElement(RSSNotificationItem, { linkPost, subscribed: "plus" }),
		);
		feed.addItem({
			title: linkPost.link.title,
			id: linkPost.link.url,
			link: linkPost.link.url,
			description: linkPost.link.description || undefined,
			content: html,
			date: new Date(),
		});
	}

	return new Response(feed.rss2(), {
		headers: { "Content-Type": "application/rss+xml" },
	});
};
