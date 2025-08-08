export type VerificationTypes = "onboarding" | "reset-password" | "change-email" | "2fa";
/**
 * Check if a user exists with the given email
 */
export declare function checkUserExists(email: string): Promise<boolean>;
/**
 * Prepares verification by generating an OTP and creating a verification record
 */
export declare function prepareVerification({ period, type, target, request, }: {
    period: number;
    type: VerificationTypes;
    target: string;
    request: Request;
}): Promise<{
    otp: string;
    verifyUrl: URL;
}>;
/**
 * Validates an OTP code against a verification record
 */
export declare function isCodeValid({ code, type, target, }: {
    code: string;
    type: VerificationTypes;
    target: string;
}): Promise<boolean>;
/**
 * Deletes a verification record
 */
export declare function deleteVerification(type: VerificationTypes, target: string): Promise<void>;
