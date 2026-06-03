import { Avatar, Box, Flex, Link, Text } from "@radix-ui/themes";
import type { RenderedLinkPost } from "@sill/schema";
import { Fragment } from "react";

/**
 * Bookmark-style collections whose shares roll up into a single card per link:
 * instead of one card per bookmarker, all bookmarkers of a link collapse into
 * "{A}, {B}, and {C} bookmarked this …". Each collection rolls up separately
 * (its own card + logo), so Semble and the community lexicon don't merge.
 */
const SEMBLE = "network.cosmik.card";
const COMMUNITY = "community.lexicon.bookmarks.bookmark";
export const ROLLUP_COLLECTIONS = new Set<string>([SEMBLE, COMMUNITY]);

const MAX_AVATARS = 3;

/** Distinct bookmarkers in the group, keeping the group's (date-sorted) order. */
const distinctActors = (group: RenderedLinkPost[]): RenderedLinkPost[] => {
	const seen = new Set<string>();
	const actors: RenderedLinkPost[] = [];
	for (const p of group) {
		const key = p.actorHandle ?? p.actorUrl;
		if (!key || seen.has(key)) continue;
		seen.add(key);
		actors.push(p);
	}
	return actors;
};

const action = (
	collection: string | null | undefined,
	sembleHref: string | null,
) => {
	if (collection === SEMBLE) {
		return (
			<>
				{" "}
				bookmarked this on{" "}
				{sembleHref ? (
					<Link href={sembleHref} target="_blank" rel="noreferrer">
						Semble
					</Link>
				) : (
					"Semble"
				)}
				.
			</>
		);
	}
	return <> bookmarked this.</>;
};

/** Comma/“and” separator before the actor at index `i` of `count` total. */
const separator = (i: number, count: number): string => {
	if (i === 0) return "";
	if (i === count - 1) return count > 2 ? ", and " : " and ";
	return ", ";
};

const BookmarkRollup = ({
	group,
	layout,
}: {
	group: RenderedLinkPost[];
	layout: "default" | "dense";
}) => {
	const actors = distinctActors(group);
	if (actors.length === 0) return null;
	const collection = group[0]?.collection;
	// For Semble, the cosmik mapper carries the Semble page URL (built from the
	// raw record URL) on `postUrl`.
	const sembleHref = group[0]?.postUrl ?? null;

	return (
		// Mirrors a regular post card: an avatar column on the left and an indented
		// content column that wraps within itself (so wrapped lines align under the
		// text, not back under the avatars).
		<Flex align="start" gap={{ initial: "2", sm: "3" }} mb="1" mr="5">
			{/* Vertical stack so the avatar column stays one avatar wide (a
			    horizontal pile would push the text indent out past a normal post). */}
			<Flex direction="column" align="center" mt="1" style={{ flexShrink: 0 }}>
				{actors.slice(0, MAX_AVATARS).map((a, i) => (
					<Avatar
						key={a.actorHandle ?? a.actorUrl ?? i}
						size="1"
						radius="full"
						src={a.actorAvatarUrl || undefined}
						fallback={(a.actorHandle ?? "?").charAt(0)}
						style={{
							width: "20px",
							height: "20px",
							marginTop: i === 0 ? 0 : "-6px",
							boxShadow: "0 0 0 2px var(--color-panel-solid)",
						}}
						loading="lazy"
						decoding="async"
					/>
				))}
			</Flex>
			<Box flexGrow="1" style={{ minWidth: 0 }}>
				<Text
					size={{
						initial: layout === "dense" ? "1" : "2",
						sm: layout === "dense" ? "2" : "3",
					}}
				>
					{actors.map((a, i) => (
						<Fragment key={a.actorHandle ?? a.actorUrl ?? i}>
							{separator(i, actors.length)}
							<Link
								href={a.actorUrl}
								target="_blank"
								rel="noreferrer"
								underline="hover"
							>
								{a.actorName || a.actorHandle}
							</Link>
						</Fragment>
					))}
					{action(collection, sembleHref)}
				</Text>
			</Box>
		</Flex>
	);
};

export default BookmarkRollup;
