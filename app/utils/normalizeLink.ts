const knownSearchParameters = [
	"utm_source",
	"utm_medium",
	"utm_campaign",
	"utm_term",
	"utm_content",
	"fbclid",
	"gclid",
	"smid",
	"ref",
	"ref_",
	"smtyp",
	"source",
	"referringSource",
];

export const normalizeLink = (url: string): string => {
	const parsed = new URL(url);

	for (const key of knownSearchParameters) {
		parsed.searchParams.delete(key);
	}

	let stringified = parsed.toString();
	stringified = stringified.replace(
		parsed.origin,
		parsed.origin.toLocaleLowerCase(),
	);

	return stringified;
};
