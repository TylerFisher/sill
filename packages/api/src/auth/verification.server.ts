import { and, eq, gt, isNull, or } from "drizzle-orm";
import { uuidv7 } from "uuidv7-js";
import { db } from "../database/db.server.js";
import { user, verification } from "../database/schema.server.js";
import { generateTOTP, verifyTOTP } from "./totp.server.js";

export type VerificationTypes = "onboarding" | "reset-password" | "change-email" | "2fa";

/**
 * Check if a user exists with the given email
 */
export async function checkUserExists(email: string): Promise<boolean> {
	const existingUser = await db.query.user.findFirst({
		where: eq(user.email, email),
		columns: { id: true },
	});
	return !!existingUser;
}

/**
 * Prepares verification by generating an OTP and creating a verification record
 */
export async function prepareVerification({
	period,
	type,
	target,
	request,
}: {
	period: number;
	type: VerificationTypes;
	target: string;
	request: Request;
}) {
	const { otp, ...verificationConfig } = await generateTOTP({
		// Leaving off 0, O, and I on purpose to avoid confusing users.
		charSet: "ABCDEFGHJKLMNPQRSTUVWXYZ123456789",
		period,
	});
	
	const verificationData = {
		type,
		target,
		...verificationConfig,
		expiresAt: new Date(Date.now() + verificationConfig.period * 1000),
	};
	
	await db
		.insert(verification)
		.values({
			id: uuidv7(),
			...verificationData,
			expiresAt: verificationData.expiresAt,
		})
		.onConflictDoUpdate({
			target: [verification.target, verification.type],
			set: {
				...verificationData,
				expiresAt: verificationData.expiresAt,
			},
		});

	// Create verify URL using the original web request domain
	// SECURITY: Never include the OTP code in the URL - it must be entered manually
	const forwardedHost = request.headers.get("x-forwarded-host");
	const forwardedProto = request.headers.get("x-forwarded-proto") || "http";
	const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : new URL(request.url).origin;
	const verifyUrl = new URL(`/accounts/verify?type=${type}&target=${encodeURIComponent(target)}`, origin);

	return { otp, verifyUrl };
}

/**
 * Validates an OTP code against a verification record
 */
export async function isCodeValid({
	code,
	type,
	target,
}: {
	code: string;
	type: VerificationTypes;
	target: string;
}) {
	const existingVerification = await db.query.verification.findFirst({
		where: and(
			eq(verification.target, target),
			eq(verification.type, type),
			or(
				gt(verification.expiresAt, new Date()),
				isNull(verification.expiresAt),
			),
		),
		columns: { algorithm: true, secret: true, period: true, charSet: true },
	});
	
	if (!existingVerification) return false;
	
	const result = verifyTOTP({
		otp: code,
		...existingVerification,
	});
	
	return !!result;
}

/**
 * Deletes a verification record
 */
export async function deleteVerification(type: VerificationTypes, target: string) {
	await db
		.delete(verification)
		.where(
			and(
				eq(verification.type, type),
				eq(verification.target, target),
			),
		);
}