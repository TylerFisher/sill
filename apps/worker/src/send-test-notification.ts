/**
 * Send a test notification email containing one card for every share type Sill
 * renders, so the email template's per-type handling (source label + post body)
 * can be eyeballed in a real inbox. Covers Bluesky (post + quote), Mastodon, and
 * every "atbookmark" lexicon: Semble, the Sill/community bookmark, Rocksky,
 * Leaflet, Offprint, and Pckt.
 *
 * Each card's post mirrors what the matching record-mapper in
 * `@sill/links/record-mappers` emits (same `postText` HTML, `postUrl`, and
 * `collection`), so the email matches production output without needing the AppView.
 *
 * Env:
 *   TEST_EMAIL                          recipient (or pass as the first CLI arg)
 *   MAILGUN_API_KEY, EMAIL_DOMAIN       required to actually send (see email-service)
 *
 * Run from apps/worker:
 *   TEST_EMAIL=you@example.com pnpm tsx --env-file ../../.env src/send-test-notification.ts
 *   pnpm tsx --env-file ../../.env src/send-test-notification.ts you@example.com
 */

import { sendNotificationEmail } from "@sill/emails";
import type {
	MostRecentLinkPosts,
	RenderedLink,
	RenderedLinkPost,
} from "@sill/schema";

const to = process.env.TEST_EMAIL || process.argv[2];

const AVATAR = "https://avatar.vercel.sh/jane.png";
const NOW = new Date().toISOString();

let seq = 0;
const id = () => `00000000-0000-0000-0000-${String(++seq).padStart(12, "0")}`;

const makeLink = (overrides: Partial<RenderedLink>): RenderedLink => ({
	id: id(),
	url: "https://example.com/article",
	title: "An example article",
	description: "A representative link card for the test digest.",
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
	postDate: NOW,
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

/** One card (link + a single post of the given type). */
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
	// Bluesky — a normal post.
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

	// Bluesky — a quote post (exercises the quoted block).
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

	// Mastodon — a status.
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

	// Semble — network.cosmik.card.
	card(
		"Semble · a bookmark",
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

	// Sill / community bookmark — community.lexicon.bookmarks.bookmark.
	card(
		"Sill · a bookmark",
		"https://example.com/sill-bookmark",
		makePost({
			postType: "atbookmark",
			collection: "community.lexicon.bookmarks.bookmark",
			postUrl: "https://bsky.app/profile/jane.test",
			postText: '<span class="sill-bookmark">Bookmarked this URL.</span>',
		}),
	),

	// Rocksky — app.rocksky.scrobble.
	card(
		"Rocksky · a scrobble",
		"https://example.com/rocksky",
		makePost({
			postType: "atbookmark",
			collection: "app.rocksky.scrobble",
			postUrl:
				"https://rocksky.app/did%3Aplc%3Atestlistener/scrobble/3ktestscrobble",
			postText:
				'<div class="scrobble-card"><div>Listened to <a href="https://open.spotify.com/track/test"><strong>Test Track</strong></a> by Test Artist</div><div style="font-size:12px;color:#666;margin-top:4px">Test Album · 2024 · Indie</div></div>',
			actorUrl: "https://rocksky.app/did%3Aplc%3Atestlistener",
		}),
	),

	// Leaflet — site.standard.document carrying pub.leaflet.content.
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

	// Offprint — site.standard.document carrying app.offprint.content.
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

	// Pckt — site.standard.document carrying blog.pckt.content.
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

async function main(): Promise<void> {
	if (!to) {
		console.error(
			"Recipient required: set TEST_EMAIL or pass it as the first argument.",
		);
		process.exit(1);
	}
	if (!process.env.MAILGUN_API_KEY || !process.env.EMAIL_DOMAIN) {
		console.error(
			"MAILGUN_API_KEY and EMAIL_DOMAIN are required to send (see email-service).",
		);
		process.exit(1);
	}

	console.log(`Sending test notification (${links.length} types) to ${to}…`);
	await sendNotificationEmail({
		to,
		subject: "Sill test: all share types",
		links,
		groupName: "All share types",
		subscribed: "plus",
		freeTrialEnd: null,
	});
	console.log("Sent.");
	process.exit(0);
}

main().catch((e) => {
	console.error("Failed to send test notification:", e);
	process.exit(1);
});
