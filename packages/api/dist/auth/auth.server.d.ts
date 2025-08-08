export declare const SESSION_EXPIRATION_TIME: number;
export declare const getSessionExpirationDate: () => Date;
export declare const sessionKey = "sessionId";
/**
 * Validates session from request headers and returns user ID
 * @param request Request object
 * @returns User ID from session or null
 */
export declare function getUserIdFromSession(request: Request): Promise<string | null>;
/**
 * Validates a session ID and returns user ID
 * @param sessionId Session ID to validate
 * @returns User ID or null
 */
export declare function validateSession(sessionId: string): Promise<string | null>;
/**
 * Deletes a session from the database
 * @param sessionId Session ID to delete
 */
export declare function deleteSession(sessionId: string): Promise<void>;
/**
 * Handles the login process by verifying the user's credentials and creating a new session
 * @param param0 Object with email and password
 * @returns New session object
 */
export declare function login({ email, password, }: {
    email: string;
    password: string;
}): Promise<{
    id: string;
    userId: string;
    expirationDate: Date;
} | null>;
/**
 * Handles the signup process by creating a new user, hashing the password, and returning a new session
 * @param param0 Object with email, password, and name
 * @returns New session object
 */
export declare function signup({ email, sentPassword, name, }: {
    email: string;
    name: string;
    sentPassword: string;
}): Promise<{
    id: string;
    userId: string;
    expirationDate: Date;
}>;
/**
 * Hashes a plaintext password
 * @param password Plaintext password
 * @returns Hashed password
 */
export declare function getPasswordHash(password: string): Promise<string>;
/**
 * Verifies a user's password by checking the stored hash against the plaintext password
 * @param userInfo Either email or userId
 * @param password Plaintext password
 * @returns User ID if the password is valid, otherwise null
 */
export declare function verifyUserPassword(userInfo: {
    email?: string | undefined;
    userId?: string;
}, password: string): Promise<{
    id: string;
} | null>;
/**
 * Resets a user's password by updating the stored hash
 * @param param0 Object with user ID and new password
 * @returns Updated password object
 */
export declare function resetUserPassword({ userId, newPassword, }: {
    userId: string;
    newPassword: string;
}): Promise<import("pg").QueryResult<never>>;
export type SubscriptionStatus = "free" | "plus" | "trial";
export declare const isSubscribed: (userId: string) => Promise<SubscriptionStatus>;
export declare const hasAgreed: (userId: string) => Promise<boolean>;
/**
 * Gets user profile with social accounts, lists, and subscription status
 * @param userId User ID
 * @returns User profile with social accounts and subscription status
 */
export declare const getUserProfile: (userId: string) => Promise<{
    subscriptionStatus: SubscriptionStatus;
    id: string;
    name: string | null;
    email: string;
    customerId: string | null;
    freeTrialEnd: Date | null;
    createdAt: Date;
    emailConfirmed: boolean;
    mastodonAccounts: {
        id: string;
        createdAt: Date;
        userId: string;
        mostRecentPostId: string | null;
        instanceId: string;
        accessToken: string;
        tokenType: string;
        expiresIn: number | null;
        refreshToken: string | null;
        mastodonInstance: {
            id: string;
            createdAt: Date;
            instance: string;
            clientId: string;
            clientSecret: string;
        };
        lists: {
            id: string;
            name: string;
            uri: string;
            mostRecentPostDate: Date | null;
            mostRecentPostId: string | null;
            blueskyAccountId: string | null;
            mastodonAccountId: string | null;
        }[];
    }[];
    blueskyAccounts: {
        id: string;
        userId: string;
        mostRecentPostDate: Date | null;
        service: string;
        handle: string;
        did: string;
        lists: {
            id: string;
            name: string;
            uri: string;
            mostRecentPostDate: Date | null;
            mostRecentPostId: string | null;
            blueskyAccountId: string | null;
            mastodonAccountId: string | null;
        }[];
    }[];
    subscriptions: {
        id: string;
        createdAt: Date | null;
        userId: string;
        status: string;
        polarId: string;
        polarProductId: string;
        periodStart: Date | null;
        periodEnd: Date | null;
        cancelAtPeriodEnd: boolean;
    }[];
    bookmarks: {
        id: string;
        linkUrl: string;
        createdAt: Date;
        userId: string;
        posts: import("../types.server.js").MostRecentLinkPosts;
    }[];
} | null>;
