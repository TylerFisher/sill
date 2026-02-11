import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { giftLinkFormats } from "./normalizers/giftLinkFormat.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const shorteners = await readFile(
  join(__dirname, "normalizers/shorteners.txt"),
  "utf-8"
).then((content) => content.split("\n"));

const trackingParameters = await readFile(
  join(__dirname, "normalizers/trackingParams.txt"),
  "utf-8"
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
    parsed.origin.toLocaleLowerCase()
  );

  return stringified;
};

export const isShortenedLink = async (url: string): Promise<boolean> => {
  try {
    const parsed = new URL(url);
    return shorteners.some(
      (shortener) =>
        parsed.hostname === shortener ||
        parsed.hostname.endsWith(`.${shortener}`),
    );
  } catch (e) {
    console.log("error parsing shortened url", url);
    return false;
  }
};

const urlExpansionCache = new Map<string, string>();

export const clearUrlExpansionCache = () => {
  urlExpansionCache.clear();
};

export const getFullUrl = async (url: string): Promise<string> => {
  const cached = urlExpansionCache.get(url);
  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "*",
      },
    });
    clearTimeout(timeout);
    urlExpansionCache.set(url, response.url);
    return response.url;
  } catch (e) {
    clearTimeout(timeout);
    console.log("timed out expanding", url, e?.constructor?.name);
    urlExpansionCache.set(url, url);
    return url;
  }
};

export const isGiftLink = async (url: string): Promise<boolean> => {
  try {
    const parsed = new URL(url);
    const format = giftLinkFormats[parsed.hostname.replace("www.", "")];
    if (format) {
      for (const key of format) {
        if (!parsed.searchParams.has(key)) {
          return false;
        }
      }
      return true;
    }
    return false;
  } catch (e) {
    console.log("error parsing gift link", url);
    return false;
  }
};
