/**
 * Popfeed review card helpers, shared by the web feed (LinkRep) and the
 * web-served RSS renderers. A Popfeed review's link is rewritten to a
 * `popfeed.social` work page (see `urlItemToLink` / `popfeedWorkUrl`), and the
 * card shows a vertical poster beside "{credit} / {title} / {type} • {year}".
 */

/**
 * Whether a link is a Popfeed review card. Keyed on the AppView-supplied
 * `workType` (set only on review items) rather than the host — a plain link to
 * popfeed.social from elsewhere carries no review data and must not get the
 * poster layout.
 */
export const isReviewCard = (link: { workType?: string | null }): boolean =>
	!!link.workType;

/** Work type as a display label: `video_game` → `Video Game`, `tvShow` →
 *  `TV Show`, `movie` → `Movie`. */
export const workTypeLabel = (t: string): string =>
	t
		.replace(/_/g, " ")
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.split(" ")
		.map((w) =>
			w.toLowerCase() === "tv"
				? "TV"
				: w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
		)
		.join(" ");

/** Release year from a `publishedDate`, or null when absent/unparseable. */
export const popfeedYear = (
	publishedDate: string | null | undefined,
): number | null => {
	if (!publishedDate) return null;
	const d = new Date(publishedDate);
	return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
};

/** The "{type} • {year}" line (either part optional). Empty string when neither. */
export const workTypeYearLine = (
	workType: string | null | undefined,
	publishedDate: string | null | undefined,
): string => {
	const type = workType ? workTypeLabel(workType) : "";
	const year = popfeedYear(publishedDate);
	return [type, year != null ? String(year) : ""].filter(Boolean).join(" • ");
};
