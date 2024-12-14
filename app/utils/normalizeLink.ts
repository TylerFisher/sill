import { readFile } from "node:fs/promises";
import { giftLinkFormats } from "./giftLinkFormat";

const shorteners = await readFile(
	"/app/app/utils/shorteners.txt",
	"utf-8",
).then((content) => content.split("\n"));

const trackingParameters = await readFile(
	"/app/app/utils/trackingParams.txt",
	"utf-8",
).then((content) => content.split("\n"));

export const normalizeLink = async (url: string): Promise<string> => {
	let parsed: URL | null = null;
	try {
		parsed = new URL(url);
	} catch (e) {
		console.log("error parsing url", url);
		return url;
	}

	for (const key of trackingParameters) {
		parsed.searchParams.delete(key);
	}

	let stringified = parsed.toString();
	stringified = stringified.replace(
		parsed.origin,
		parsed.origin.toLocaleLowerCase(),
	);

	return stringified;
};

export const isShortenedLink = async (url: string): Promise<boolean> => {
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
			signal: AbortSignal.timeout(3000),
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36",
			},
		});
		return response.url;
	} catch (e) {
		console.log("timed out expanding", url);
		return url;
	}
};

export const isGiftLink = async (url: string): Promise<boolean> => {
	try {
		const parsed = new URL(url);
		const format = giftLinkFormats[parsed.hostname.replace("www.", "")];
		if (format) {
			console.log("checking format for", parsed.href);
			for (const key of format) {
				if (!parsed.searchParams.has(key)) {
					console.log("missing key", key);
					return false;
				}
			}
			console.log("gift link found", parsed.href);
			return true;
		}
		return false;
	} catch (e) {
		console.log("error parsing gift link", url);
		return false;
	}
};
