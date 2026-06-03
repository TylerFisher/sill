import { Text } from "@radix-ui/themes";
import type { list } from "@sill/schema";
import { createContext, useContext } from "react";

type ListRow = typeof list.$inferSelect;

/**
 * Per-share source attribution. The AppView tells us how each share reached the
 * viewer via `RenderedLinkPost.sources` (canonical ids: `"follows"`, a Bluesky
 * feed/list at-URI, or `mastodon-list://…`). We surface the feed/list that
 * surfaced it as a quiet byline-level caption — but not for plain follows, and
 * not when the page is already filtered to that source (the note would be
 * redundant).
 *
 * Config (the viewer's lists and the active filter) is supplied via context so
 * the deeply-nested PostRep doesn't need it drilled through.
 */
interface SourceBadgeValue {
	/** Canonical sourceId the page is currently filtered to, or null for "all". */
	activeSourceId: string | null;
	/** Display label for a sourceId — the list/feed name, or a kind fallback. */
	labelFor: (sourceId: string) => string;
}

/** Fallback label ("feed"/"list") when a source isn't one of the viewer's lists. */
const kindLabel = (sourceId: string): string =>
	sourceId.includes("app.bsky.feed.generator") ? "a feed" : "a list";

const SourceBadgeContext = createContext<SourceBadgeValue>({
	activeSourceId: null,
	labelFor: kindLabel,
});

/** Canonical AppView sourceId for one of the viewer's lists/feeds. */
const canonicalSourceId = (
	row: ListRow,
	instance: string | undefined,
): string | undefined => {
	if (row.blueskyAccountId) return row.uri; // bsky feed/list at-URI verbatim
	if (row.mastodonAccountId && instance) {
		return `mastodon-list://${instance}/${row.uri}`;
	}
	return undefined;
};

/**
 * Build the context value from the viewer's lists, their Mastodon instance, and
 * the active `list` filter (a Sill list id, or null/"all"). Memoize at the call
 * site if the inputs are stable.
 */
export const buildSourceBadgeValue = (
	lists: ListRow[],
	instance: string | undefined,
	activeListId: string | null,
): SourceBadgeValue => {
	const names = new Map<string, string>();
	let activeSourceId: string | null = null;
	for (const row of lists) {
		const sourceId = canonicalSourceId(row, instance);
		if (!sourceId) continue;
		names.set(sourceId, row.name);
		if (activeListId && row.id === activeListId) activeSourceId = sourceId;
	}
	return {
		activeSourceId,
		labelFor: (sourceId) => names.get(sourceId) ?? kindLabel(sourceId),
	};
};

export const SourceBadgeProvider = SourceBadgeContext.Provider;

/**
 * A quiet "via {feed/list}" caption under the post byline. Skips `"follows"`
 * and the currently-filtered source; renders nothing when there's nothing to
 * attribute.
 */
const SourceBadge = ({ sources }: { sources?: string[] | null }) => {
	const { activeSourceId, labelFor } = useContext(SourceBadgeContext);
	if (!sources || sources.length === 0) return null;

	const shown = sources.filter((s) => s !== "follows" && s !== activeSourceId);
	if (shown.length === 0) return null;

	return (
		<Text as="div" size="1" color="gray" mb="1">
			via {shown.map(labelFor).join(", ")}
		</Text>
	);
};

export default SourceBadge;
