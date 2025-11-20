import type { Context } from "hono";

/**
 * Sets the session cookie with standard options
 */
export function setSessionCookie(
  c: Context,
  sessionId: string,
  expirationDate: string,
  remember = true
) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(remember ? { expires: expirationDate } : {}),
  };

  c.header(
    "Set-Cookie",
    `sessionId=${sessionId}; ${Object.entries(cookieOptions)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ")}`
  );
}
