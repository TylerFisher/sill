import { redirect } from "@remix-run/node";
import { uuidv7 } from "uuidv7-js";
import { db } from "~/drizzle/db.server";
import { session, user, password } from "~/drizzle/schema.server";
import { eq, and, gt } from "drizzle-orm";
import { authSessionStorage } from "~/utils/session.server";
import { safeRedirect } from "remix-utils/safe-redirect";
import { combineHeaders } from "./misc";
import bcrypt from "bcryptjs";

export const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30;
export const getSessionExpirationDate = () =>
	new Date(Date.now() + SESSION_EXPIRATION_TIME);

export const sessionKey = "sessionId";

export async function getUserId(request: Request) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get("cookie"),
	);
	const sessionId = await authSession.get(sessionKey);
	if (!sessionId) return null;
	const existingSession = await db.query.session.findFirst({
		columns: {},
		with: {
			user: {
				columns: { id: true },
			},
		},
		where: and(
			eq(session.id, sessionId),
			gt(session.expirationDate, new Date()),
		),
	});

	if (!existingSession?.user) {
		throw redirect("/", {
			headers: {
				"set-cookie": await authSessionStorage.destroySession(authSession),
			},
		});
	}
	return existingSession.user.id;
}

export async function requireUserId(
	request: Request,
	{ redirectTo }: { redirectTo?: string | null } = {},
) {
	const userId = await getUserId(request);
	if (!userId) {
		const requestUrl = new URL(request.url);
		redirectTo =
			redirectTo === null
				? null
				: (redirectTo ?? `${requestUrl.pathname}${requestUrl.search}`);
		const loginParams = redirectTo ? new URLSearchParams({ redirectTo }) : null;
		const loginRedirect = ["/accounts/login", loginParams?.toString()]
			.filter(Boolean)
			.join("?");
		throw redirect(loginRedirect);
	}
	return userId;
}

export async function requireAnonymous(request: Request) {
	const userId = await getUserId(request);
	if (userId) {
		throw redirect("/");
	}
}

export async function logout(
	{
		request,
		redirectTo = "/",
	}: {
		request: Request;
		redirectTo?: string;
	},
	responseInit?: ResponseInit,
) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get("cookie"),
	);
	const sessionId = authSession.get(sessionKey);
	// if this fails, we still need to delete the session from the user's browser
	// and it doesn't do any harm staying in the db anyway.
	if (sessionId) {
		await db.delete(session).where(eq(session.id, sessionId));
	}
	return redirect(safeRedirect(redirectTo), {
		...responseInit,
		headers: combineHeaders(
			{ "set-cookie": await authSessionStorage.destroySession(authSession) },
			responseInit?.headers,
		),
	});
}

export async function login({
	username,
	password,
}: {
	username: string;
	password: string;
}) {
	const user = await verifyUserPassword({ username }, password);
	if (!user) return null;
	const newSession = await db
		.insert(session)
		.values({
			id: uuidv7(),
			expirationDate: getSessionExpirationDate(),
			userId: user.id,
		})
		.returning({
			id: session.id,
			expirationDate: session.expirationDate,
			userId: session.userId,
		});
	return newSession[0];
}

export async function signup({
	email,
	username,
	sentPassword,
	name,
}: {
	email: string;
	username: string;
	name: string;
	sentPassword: string;
}) {
	const hashedPassword = await getPasswordHash(sentPassword);

	const transaction = await db.transaction(async (tx) => {
		const result = await tx
			.insert(user)
			.values({
				id: uuidv7(),
				email: email.toLowerCase(),
				username: username.toLowerCase(),
				name,
			})
			.returning({
				id: user.id,
			});

		await tx.insert(password).values({
			hash: hashedPassword,
			userId: result[0].id,
		});

		const newSession = await tx
			.insert(session)
			.values({
				id: uuidv7(),
				expirationDate: getSessionExpirationDate(),
				userId: result[0].id,
			})
			.returning({
				id: session.id,
				expirationDate: session.expirationDate,
				userId: session.userId,
			});

		return {
			session: newSession[0],
		};
	});

	return transaction.session;
}

export async function getPasswordHash(password: string) {
	const hash = await bcrypt.hash(password, 10);
	return hash;
}

export async function verifyUserPassword(
	userInfo: { username?: string | undefined; userId?: string },
	password: string,
) {
	let where = null;
	if (userInfo.username) {
		where = eq(user.username, userInfo.username);
	}
	if (userInfo.userId) {
		where = eq(user.username, userInfo.userId);
	}

	if (!where) {
		return null;
	}

	const userWithPassword = await db.query.user.findFirst({
		where: where,
		columns: { id: true },
		with: {
			password: {
				columns: {
					hash: true,
				},
			},
		},
	});

	if (!userWithPassword || !userWithPassword.password) {
		return null;
	}

	const isValid = await bcrypt.compare(
		password,
		userWithPassword.password.hash,
	);

	if (!isValid) {
		return null;
	}

	return { id: userWithPassword.id };
}

export async function resetUserPassword({
	userId,
	newPassword,
}: {
	userId: string;
	newPassword: string;
}) {
	const hashedPassword = await getPasswordHash(newPassword);
	return db
		.update(password)
		.set({
			hash: hashedPassword,
		})
		.where(eq(password.userId, userId));
}
