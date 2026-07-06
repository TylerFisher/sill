/**
 * Guard against open redirects: only allow same-origin paths. Returns `to` when
 * it's a safe internal path (a single leading "/"), otherwise `fallback`.
 *
 * Use wherever a user-controllable `redirectTo` is consumed (login action, OAuth
 * callbacks) so a crafted `?redirectTo=https://evil.example` can't bounce a
 * freshly-authenticated user off-site.
 */
export function safeRedirect(
	to: string | null | undefined,
	fallback = "/links",
): string {
	if (
		!to ||
		!to.startsWith("/") ||
		to.startsWith("//") ||
		to.startsWith("/\\")
	) {
		return fallback;
	}
	return to;
}
