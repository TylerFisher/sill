import bcrypt from "bcryptjs";
import { and, desc, eq, gt } from "drizzle-orm";
import { uuidv7 } from "uuidv7-js";
import { db } from "../database/db.server.js";
import {
	password,
	session,
	subscription,
	termsAgreement,
	termsUpdate,
	user,
} from "../database/schema.server.js";

export const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30;
export const getSessionExpirationDate = () =>
	new Date(Date.now() + SESSION_EXPIRATION_TIME);

export const sessionKey = "sessionId";

/**
 * Validates session from request headers and returns user ID
 * @param request Request object
 * @returns User ID from session or null
 */
export async function getUserIdFromSession(
	request: Request,
): Promise<string | null> {
	const sessionId = getSessionIdFromCookie(request.headers.get("cookie"));
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
		return null;
	}
	return existingSession.user.id;
}

/**
 * Extracts session ID from cookie header
 * @param cookieHeader Cookie header string
 * @returns Session ID or null
 */
function getSessionIdFromCookie(cookieHeader: string | null): string | null {
	if (!cookieHeader) return null;

	const cookies = cookieHeader.split(";").map((c) => c.trim());
	for (const cookie of cookies) {
		const [name, value] = cookie.split("=");
		if (name === sessionKey) {
			return value;
		}
	}
	return null;
}

/**
 * Validates a session ID and returns user ID
 * @param sessionId Session ID to validate
 * @returns User ID or null
 */
export async function validateSession(
	sessionId: string,
): Promise<string | null> {
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
		return null;
	}
	return existingSession.user.id;
}

/**
 * Deletes a session from the database
 * @param sessionId Session ID to delete
 */
export async function deleteSession(sessionId: string): Promise<void> {
	await db.delete(session).where(eq(session.id, sessionId));
}

/**
 * Handles the login process by verifying the user's credentials and creating a new session
 * @param param0 Object with email and password
 * @returns New session object
 */
export async function login({
	email,
	password,
}: {
	email: string;
	password: string;
}) {
	const user = await verifyUserPassword({ email }, password);
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

/**
 * Handles the signup process by creating a new user, hashing the password, and returning a new session
 * @param param0 Object with email, password, and name
 * @returns New session object
 */
export async function signup({
	email,
	sentPassword,
	name,
}: {
	email: string;
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
				name,
				emailConfirmed: true,
				freeTrialEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
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

		const latestTerms = await tx.query.termsUpdate.findFirst({
			orderBy: desc(termsUpdate.termsDate),
		});

		if (latestTerms) {
			await tx.insert(termsAgreement).values({
				id: uuidv7(),
				userId: result[0].id,
				termsUpdateId: latestTerms.id,
			});
		}

		return {
			session: newSession[0],
		};
	});

	return transaction.session;
}

/**
 * Hashes a plaintext password
 * @param password Plaintext password
 * @returns Hashed password
 */
export async function getPasswordHash(password: string) {
	const hash = await bcrypt.hash(password, 10);
	return hash;
}

/**
 * Verifies a user's password by checking the stored hash against the plaintext password
 * @param userInfo Either email or userId
 * @param password Plaintext password
 * @returns User ID if the password is valid, otherwise null
 */
export async function verifyUserPassword(
	userInfo: { email?: string | undefined; userId?: string },
	password: string,
) {
	let where = null;
	if (userInfo.email) {
		where = eq(user.email, userInfo.email);
	}
	if (userInfo.userId) {
		where = eq(user.id, userInfo.userId);
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

/**
 * Resets a user's password by updating the stored hash
 * @param param0 Object with user ID and new password
 * @returns Updated password object
 */
export async function resetUserPassword({
	userId,
	newPassword,
}: {
	userId: string;
	newPassword: string;
}) {
	const hashedPassword = await getPasswordHash(newPassword);
	return await db
		.update(password)
		.set({
			hash: hashedPassword,
		})
		.where(eq(password.userId, userId));
}

export type SubscriptionStatus = "free" | "plus" | "trial";

export const isSubscribed = async (
	userId: string,
): Promise<SubscriptionStatus> => {
	const dbUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
		with: {
			subscriptions: {
				where: and(
					eq(subscription.status, "active"),
					eq(subscription.userId, userId),
				),
			},
		},
	});
	if (!dbUser) return "free";

	const subscribed = dbUser.subscriptions.length > 0;
	if (!subscribed && dbUser.freeTrialEnd) {
		if (new Date() < dbUser.freeTrialEnd) {
			return "trial";
		}
	}

	if (!subscribed) {
		return "free";
	}

	return "plus";
};

export const hasAgreed = async (userId: string) => {
	const latestTerms = await db.query.termsUpdate.findFirst({
		orderBy: desc(termsUpdate.termsDate),
	});
	if (!latestTerms) return true;
	const agreed = await db.query.termsAgreement.findFirst({
		where: and(
			eq(termsAgreement.termsUpdateId, latestTerms.id),
			eq(termsAgreement.userId, userId),
		),
	});
	// console.log(userId, latestTerms.id, agreed, !!agreed);
	return !!agreed;
};

/**
 * Gets user profile with social accounts, lists, and subscription status
 * @param userId User ID
 * @returns User profile with social accounts and subscription status
 */
export const getUserProfile = async (userId: string) => {
	const userWithAccounts = await db.query.user.findFirst({
		where: eq(user.id, userId),
		with: {
			mastodonAccounts: {
				with: {
					lists: true,
					mastodonInstance: true,
				},
			},
			blueskyAccounts: {
				with: {
					lists: true,
				},
			},
			subscriptions: {
				where: and(
					eq(subscription.status, "active"),
					eq(subscription.userId, userId),
				),
			},
			bookmarks: true,
		},
	});

	if (!userWithAccounts) {
		return null;
	}

	// Calculate subscription status
	const subscribed = userWithAccounts.subscriptions.length > 0;
	let subscriptionStatus: SubscriptionStatus = "free";

	if (subscribed) {
		subscriptionStatus = "plus";
	} else if (
		userWithAccounts.freeTrialEnd &&
		new Date() < userWithAccounts.freeTrialEnd
	) {
		subscriptionStatus = "trial";
	}

	// Return user with subscription status
	return {
		...userWithAccounts,
		subscriptionStatus,
	};
};
