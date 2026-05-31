import { Box } from "@radix-ui/themes";
import { ClientOnly } from "remix-utils/client-only";

interface SpotifyEmbedProps {
	url: URL;
}

/**
 * Spotify's official iframe player. Works for track / album / playlist /
 * episode / show URLs by inserting `/embed` after the host. Returns null for
 * any other open.spotify.com path (e.g. a bare profile) so LinkRep falls back
 * to the regular link card.
 */
const EMBEDDABLE = new Set([
	"track",
	"album",
	"playlist",
	"episode",
	"show",
	"artist",
]);

const SpotifyEmbed = ({ url }: SpotifyEmbedProps) => {
	const segments = url.pathname.split("/").filter(Boolean);
	// Spotify localized links prefix a locale (e.g. /intl-de/track/<id>).
	const typeIndex = segments.findIndex((s) => EMBEDDABLE.has(s));
	if (typeIndex === -1) return null;
	const type = segments[typeIndex];
	const id = segments[typeIndex + 1];
	if (!id) return null;

	const src = `https://open.spotify.com/embed/${type}/${id}`;
	// Compact height for a single track/episode, taller for collections.
	const height = type === "track" || type === "episode" ? 152 : 352;

	return (
		<Box width="100%" style={{ lineHeight: 0 }}>
			<ClientOnly>
				{() => (
					<iframe
						title="Spotify player"
						src={src}
						width="100%"
						height={height}
						// Round to match Spotify's own card so the iframe clips its
						// white page background at the corners — without this the
						// square frame exposes white wedges around Spotify's rounded
						// maroon card.
						style={{ border: 0, borderRadius: "12px", display: "block" }}
						frameBorder={0}
						allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
						loading="lazy"
					/>
				)}
			</ClientOnly>
		</Box>
	);
};

export default SpotifyEmbed;
