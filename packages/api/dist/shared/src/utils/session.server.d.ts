export declare const authSessionStorage: import("react-router").SessionStorage<import("react-router").SessionData, import("react-router").SessionData>;
/**
 * Sets the instance in a cookie so we can access it later in OAuth handshake and redirects to a URL
 * @param request Request object
 * @param instance Mastodon instance URL
 * @param redirectTo URL to redirect to after setting the instance
 * @returns Redirect response with instance cookie set
 */
export declare function createInstanceCookie(request: Request, instance: string, redirectTo: string): Promise<Response>;
/**
 * Gets the instance from the session cookie
 * @param request Request object
 * @returns Instance URL from session
 */
export declare function getInstanceCookie(request: Request): Promise<string>;
