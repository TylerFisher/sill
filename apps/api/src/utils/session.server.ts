import type { Context } from "hono";
import { setCookie } from "hono/cookie";

/**
 * Sets the session cookie with standard options
 */
export function setSessionCookie(
  c: Context,
  sessionId: string,
  expirationDate: string,
  remember = true
) {
  // Default to 30 days for PWA persistence even when "remember" is false
  const expires = remember
    ? new Date(expirationDate)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  setCookie(c, "sessionId", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    expires,
  });
}
