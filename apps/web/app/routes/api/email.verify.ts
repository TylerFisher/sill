import { parseWithZod } from "@conform-to/zod";
import { invariant } from "@epic-web/invariant";
import { data } from "react-router";
import { z } from "zod";
import { requireUserFromContext } from "~/utils/context.server";
import { apiVerifyCode, apiSetEmail } from "~/utils/api-client.server";
import {
	newEmailAddressSessionKey,
	addEmailRedirectToSessionKey,
} from "~/routes/accounts/add-email";
import { verifySessionStorage } from "~/utils/verification.server";
import type { Route } from "./+types/email.verify";

const VerifyCodeSchema = z.object({
	code: z.string().min(6).max(6),
	target: z.string().email(),
});

export const action = async ({ request, context }: Route.ActionArgs) => {
	const existingUser = await requireUserFromContext(context);

	if (!existingUser) {
		return data({ error: "User not found" }, { status: 401 });
	}

	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: VerifyCodeSchema.transform(async (formDataParsed, ctx) => {
			try {
				const apiResponse = await apiVerifyCode(request, {
					code: formDataParsed.code,
					type: "add-email",
					target: formDataParsed.target,
				});
				return { ...formDataParsed, apiResponse };
			} catch (error) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						error instanceof Error ? error.message : "Verification failed",
					path: ["code"],
				});
				return z.NEVER;
			}
		}),
		async: true,
	});

	if (submission.status !== "success" || !submission.value.apiResponse) {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === "error" ? 400 : 200 },
		);
	}

	const { apiResponse, target } = submission.value;
	const responseData = await apiResponse.json();

	if ("error" in responseData) {
		return data(
			{
				result: submission.reply({
					formErrors: [responseData.error],
					fieldErrors: { code: [responseData.error] },
				}),
			},
			{ status: 400 },
		);
	}

	// Get the new email from session or use the target
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get("cookie"),
	);
	const newEmail = verifySession.get(newEmailAddressSessionKey) || target;

	invariant(newEmail, "Email address is required");

	// Set the email on the user
	await apiSetEmail(request, { email: newEmail });

	// Clear the session
	const headers = new Headers();
	headers.append(
		"set-cookie",
		await verifySessionStorage.destroySession(verifySession),
	);

	return data({ success: true, email: newEmail }, { headers });
};
