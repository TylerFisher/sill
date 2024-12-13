import { readFile } from "node:fs/promises";

const shorteners = await readFile(
	"/app/app/utils/shorteners.txt",
	"utf-8",
).then((content) => content.split("\n"));

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
	let parsed: URL | null = null;
	try {
		parsed = new URL(url);
	} catch (e) {
		console.log("error parsing url", url);
		return url;
	}

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

export const isShortenedLink = (url: string): boolean => {
	try {
		const parsed = new URL(url);
		return shorteners.includes(parsed.hostname);
	} catch (e) {
		console.log("error parsing shortened url", url);
		return false;
	}
};

export const getFullUrl = async (url: string): Promise<string> => {
	try {
		const response = await fetch(url, {
			method: "HEAD",
			redirect: "follow",
			signal: AbortSignal.timeout(2000),
		});
		return response.url;
	} catch (e) {
		console.log("timed out expanding", url);
		return url;
	}
};
