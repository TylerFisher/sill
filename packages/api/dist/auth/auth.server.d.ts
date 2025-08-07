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
