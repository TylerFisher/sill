import { createCookieSessionStorage, redirect } from "react-router";

export const authSessionStorage = createCookieSessionStorage({
	cookie: {
		name: "en_session",
		sameSite: "lax", // CSRF protection is advised if changing to 'none'
		path: "/",
		httpOnly: true,
		secrets: (process.env.SESSION_SECRET as string).split(","),
		secure: process.env.NODE_ENV === "production",
	},
});

// we have to do this because every time you commit the session you overwrite it
// so we store the expiration time in the cookie and reset it every time we commit
const originalCommitSession = authSessionStorage.commitSession;

Object.defineProperty(authSessionStorage, "commitSession", {
	value: async function commitSession(
		...args: Parameters<typeof originalCommitSession>
	) {
		const [session, options] = args;
		if (options?.expires) {
			session.set("expires", options.expires);
		}
		if (options?.maxAge) {
			session.set("expires", new Date(Date.now() + options.maxAge * 1000));
		}
		const expires = session.has("expires")
			? new Date(session.get("expires"))
			: undefined;
		const setCookieHeader = await originalCommitSession(session, {
			...options,
			expires,
		});
		return setCookieHeader;
	},
});

/**
 * Sets the instance in a cookie so we can access it later in OAuth handshake and redirects to a URL
 * @param request Request object
 * @param instance Mastodon instance URL
 * @param redirectTo URL to redirect to after setting the instance
 * @returns Redirect response with instance cookie set
 */
export async function createInstanceCookie(
	request: Request,
	instance: string,
	redirectTo: string,
) {
	const session = await authSessionStorage.getSession(
		request.headers.get("cookie"),
	);
	session.set("instance", instance);
	return redirect(redirectTo, {
		headers: {
			"Set-Cookie": await authSessionStorage.commitSession(session),
		},
	});
}

/**
 * Gets the instance from the session cookie
 * @param request Request object
 * @returns Instance URL from session
 */
export async function getInstanceCookie(request: Request) {
	const session = await authSessionStorage.getSession(
		request.headers.get("cookie"),
	);
	const instance: string = session.get("instance");
	return instance;
}
