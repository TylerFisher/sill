// Per-collection descriptor for the email/RSS "View … on …" footer link, keyed
// by atproto collection NSID (kept in sync with the card source-logo switch in
// the web's PostRep). `noun` is the word for the thing being linked — it isn't
// always a "post" (a Semble share is a card). `noun: null` means there's nothing
// to view (a Rocksky scrobble, a community bookmark), so no footer link renders;
// the post body already says everything. `site.standard.document` shares carry
// their content NSID here (pub.leaflet.content / app.offprint.content /
// blog.pckt.content), so each publisher resolves individually.
const COLLECTION_SOURCES: Record<
	string,
	{ brand: string; noun: string | null }
> = {
	"app.bsky.feed.post": { brand: "Bluesky", noun: "post" },
	"app.bsky.feed.repost": { brand: "Bluesky", noun: "post" },
	"mastodon.status": { brand: "Mastodon", noun: "post" },
	"mastodon.repost": { brand: "Mastodon", noun: "post" },
	"network.cosmik.card": { brand: "Semble", noun: "card" },
	"community.lexicon.bookmarks.bookmark": { brand: "Sill", noun: null },
	"app.rocksky.scrobble": { brand: "Rocksky", noun: null },
	"social.popfeed.feed.review": { brand: "Popfeed", noun: "review" },
	"pub.leaflet.content": { brand: "Leaflet", noun: "post" },
	"app.offprint.content": { brand: "Offprint", noun: "post" },
	"blog.pckt.content": { brand: "Pckt", noun: "post" },
};

/**
 * Text for a post's "View … on …" footer link in the digest, or null when there
 * is nothing to link to so the footer is omitted. The noun + brand come from the
 * `collection` NSID ("View post on Bluesky", "View card on Semble"); types with
 * no viewable destination (Rocksky scrobbles, community bookmarks) return null.
 * Falls back to the network from `postType`, then the destination host, for any
 * lexicon not in the table.
 */
export const postViewLabel = (
	postType: string,
	collection: string | null | undefined,
	postUrl: string | null | undefined,
): string | null => {
	let source = collection ? COLLECTION_SOURCES[collection] : undefined;
	if (!source) {
		if (postType === "bluesky") source = { brand: "Bluesky", noun: "post" };
		else if (postType === "mastodon")
			source = { brand: "Mastodon", noun: "post" };
		else if (postUrl) {
			try {
				const host = new URL(postUrl).hostname.replace(/^www\./, "");
				source = { brand: host, noun: "post" };
			} catch {
				// unparseable URL — no footer
			}
		}
	}
	if (!source || !source.noun || !postUrl) return null;
	return `View ${source.noun} on ${source.brand} →`;
};
