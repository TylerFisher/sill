import { json, redirect } from "@remix-run/node";
import type { Submission } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { z } from "zod";
import { uuidv7 } from "uuidv7-js";
import { eq, and, or, gt, isNull } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { generateTOTP, verifyTOTP } from "~/utils/totp.server";
import { getDomainUrl } from "~/utils/misc";
import { twoFAVerificationType } from "~/routes/settings.two-factor._index";
import type { twoFAVerifyVerificationType } from "~/routes/settings.two-factor.verify";
import {
	handleVerification as handleLoginTwoFactorVerification,
	shouldRequestTwoFA,
} from "~/routes/accounts.login.server";
import {
	VerifySchema,
	codeQueryParam,
	redirectToQueryParam,
	targetQueryParam,
	typeQueryParam,
	type VerificationTypes,
} from "./accounts.verify";
import { handleVerification as handleOnboardingVerification } from "./accounts.onboarding.server";
import { handleVerification as handleResetPasswordVerification } from "./accounts.reset-password.server";
import { handleVerification as handleChangeEmailVerification } from "~/routes/accounts.change-email.server";
import { requireUserId } from "~/utils/auth.server";
import { verification } from "~/drizzle/schema.server";

export type VerifyFunctionArgs = {
	request: Request;
	submission: Submission<
		z.input<typeof VerifySchema>,
		string[],
		z.output<typeof VerifySchema>
	>;
	body: FormData | URLSearchParams;
};

/**
 * Ensures that the user has recently verified their account if 2FA is enabled
 * @param request Request object
 */
export async function requireRecentVerification(request: Request) {
	const userId = await requireUserId(request);
	const shouldReverify = await shouldRequestTwoFA(request);
	if (shouldReverify) {
		const reqUrl = new URL(request.url);
		const redirectUrl = getRedirectToUrl({
			request,
			target: userId,
			type: twoFAVerificationType,
			redirectTo: reqUrl.pathname + reqUrl.search,
		});
		throw redirect(redirectUrl.toString());
	}
}
/**
 * Gets the redirect URL for verification and sets search parameters for verification type, target, and redirect URL
 * @param param0 Parameters for function including request, verification type, verification target, and redirect URL
 * @returns Redirect URL for verification
 */
export function getRedirectToUrl({
	request,
	type,
	target,
	redirectTo,
}: {
	request: Request;
	type: VerificationTypes;
	target: string;
	redirectTo?: string;
}) {
	const redirectToUrl = new URL(`${getDomainUrl(request)}/accounts/verify`);
	redirectToUrl.searchParams.set(typeQueryParam, type);
	redirectToUrl.searchParams.set(targetQueryParam, target);
	if (redirectTo) {
		redirectToUrl.searchParams.set(redirectToQueryParam, redirectTo);
	}
	return redirectToUrl;
}

/**
 * Prepares verification by generating an OTP, creating a verification record, and setting the redirect URL
 * @param param0 Parameters for verification including time period,
 * request, verification type, and verification target
 * @returns Object with OTP, redirect URL, and verification URL
 */
export async function prepareVerification({
	period,
	request,
	type,
	target,
}: {
	period: number;
	request: Request;
	type: VerificationTypes;
	target: string;
}) {
	const verifyUrl = getRedirectToUrl({ request, type, target });
	const redirectTo = new URL(verifyUrl.toString());

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

	// add the otp to the url we'll email the user.
	verifyUrl.searchParams.set(codeQueryParam, otp);

	return { otp, redirectTo, verifyUrl };
}

/**
 * Assesses validity of OTP code
 * @param param0 Parameters for function including OTP code, verification type, and verification target
 * @returns Boolean indicating if the OTP code is valid
 */
export async function isCodeValid({
	code,
	type,
	target,
}: {
	code: string;
	type: VerificationTypes | typeof twoFAVerifyVerificationType;
	target: string;
}) {
	const existingVerification = await db.query.verification.findFirst({
		where: and(
			// First condition: target and type must match
			eq(verification.target, target),
			eq(verification.type, type),

			// Second condition: OR clause for expiresAt
			or(
				gt(verification.expiresAt, new Date()), // expiresAt is greater than the current date
				isNull(verification.expiresAt), // or expiresAt is null
			),
		),
		columns: { algorithm: true, secret: true, period: true, charSet: true },
	});
	if (!existingVerification) return false;
	const result = verifyTOTP({
		otp: code,
		...existingVerification,
	});
	if (!result) return false;

	return true;
}

/**
 * Determines the type of verification requested and handles the verification process
 * Also parses the submission with Zod and validates the submission
 * @param request Request object
 * @param body Body of the submission to validate
 * @returns Verification response
 */
export async function validateRequest(
	request: Request,
	body: URLSearchParams | FormData,
) {
	const submission = await parseWithZod(body, {
		schema: VerifySchema.superRefine(async (data, ctx) => {
			const codeIsValid = await isCodeValid({
				code: data[codeQueryParam],
				type: data[typeQueryParam],
				target: data[targetQueryParam],
			});
			if (!codeIsValid) {
				ctx.addIssue({
					path: ["code"],
					code: z.ZodIssueCode.custom,
					message: "Invalid code",
				});
				return;
			}
		}),
		async: true,
	});

	if (submission.status !== "success") {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === "error" ? 400 : 200 },
		);
	}

	const { value: submissionValue } = submission;

	async function deleteVerification() {
		await db
			.delete(verification)
			.where(
				and(
					eq(verification.type, submissionValue[typeQueryParam]),
					eq(verification.target, submissionValue[targetQueryParam]),
				),
			);
	}

	switch (submissionValue[typeQueryParam]) {
		case "reset-password": {
			await deleteVerification();
			return handleResetPasswordVerification({ request, body, submission });
		}
		case "onboarding": {
			await deleteVerification();
			return handleOnboardingVerification({ request, body, submission });
		}
		case "change-email": {
			await deleteVerification();
			return handleChangeEmailVerification({ request, body, submission });
		}
		case "2fa": {
			return handleLoginTwoFactorVerification({ request, body, submission });
		}
	}
}
