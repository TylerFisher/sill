import * as cookie from "cookie";

const cookieName = "en_layout";
export type Layout = "default" | "dense";

/**
 * Gets the theme string from the cookie
 * @param request Request object
 * @returns Theme string from cookie
 */
export function getLayout(request: Request): Layout | null {
	const cookieHeader = request.headers.get("cookie");
	const parsed = cookieHeader
		? cookie.parse(cookieHeader)[cookieName]
		: "default";
	if (parsed === "default" || parsed === "dense") return parsed;
	return null;
}

/**
 * Sets the theme string in the cookie
 * @param theme Theme string to set in cookie
 * @returns Cookie string to set in response
 */
export function setLayout(theme: Layout | "default") {
	return cookie.serialize(cookieName, theme, { path: "/", maxAge: 31536000 });
}
