// Common named HTML entities seen in scraped page metadata (titles, descriptions,
// site names). Numeric entities are handled generically below, so this only needs
// the named ones scrapers actually emit. Unknown names are left untouched.
const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  copy: "©",
  reg: "®",
  trade: "™",
  deg: "°",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  acirc: "â",
  ecirc: "ê",
  uuml: "ü",
  ouml: "ö",
  auml: "ä",
  szlig: "ß",
  ccedil: "ç",
  ntilde: "ñ",
  iuml: "ï",
  oslash: "ø",
  aring: "å",
};

/**
 * Decode HTML entities in scraped display text (titles, descriptions, site
 * names) so they don't render as raw `&amp;` / `&#39;` / `&#x2019;`. Handles
 * decimal and hex numeric entities plus the common named ones; any entity it
 * doesn't recognise is left as-is (no data loss). Decodes a single level, which
 * is what scraped metadata needs.
 */
export const decodeHtmlEntities = (input: string): string =>
  input.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (match, body: string) => {
      if (body[0] === "#") {
        const code =
          body[1] === "x" || body[1] === "X"
            ? Number.parseInt(body.slice(2), 16)
            : Number.parseInt(body.slice(1), 10);
        if (Number.isFinite(code) && code > 0 && code <= 0x10ffff) {
          try {
            return String.fromCodePoint(code);
          } catch {
            return match;
          }
        }
        return match;
      }
      return NAMED[body] ?? match;
    },
  );

/** `decodeHtmlEntities` that passes null/undefined through unchanged. */
export const decodeHtmlEntitiesMaybe = <T extends string | null | undefined>(
  input: T,
): T => (typeof input === "string" ? (decodeHtmlEntities(input) as T) : input);
