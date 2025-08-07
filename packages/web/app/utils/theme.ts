import * as cookie from "cookie";

const cookieName = "en_theme";
export type Theme = "light" | "dark";

/**
 * Gets the theme string from the cookie
 * @param request Request object
 * @returns Theme string from cookie
 */
export function getTheme(request: Request): Theme | null {
	const cookieHeader = request.headers.get("cookie");
	const parsed = cookieHeader
		? cookie.parse(cookieHeader)[cookieName]
		: "light";
	if (parsed === "light" || parsed === "dark") return parsed;
	return null;
}

/**
 * Sets the theme string in the cookie
 * @param theme Theme string to set in cookie
 * @returns Cookie string to set in response
 */
export function setTheme(theme: Theme | "system") {
	if (theme === "system") {
		return cookie.serialize(cookieName, "", { path: "/", maxAge: -1 });
	}
	return cookie.serialize(cookieName, theme, { path: "/", maxAge: 31536000 });
}
