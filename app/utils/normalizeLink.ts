import { readFile } from "node:fs/promises";

const shorteners = await readFile(
	"/app/app/utils/shorteners.txt",
	"utf-8",
).then((content) => content.split("\n"));

const trackingParameters = await readFile(
	"/app/app/utils/trackingParams.txt",
	"utf-8",
).then((content) => content.split("\n"));

export const normalizeLink = (url: string): string => {
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
