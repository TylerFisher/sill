import { parseWithZod } from "@conform-to/zod";
import { data } from "react-router";
import { z } from "zod";
import { requireUserFromContext } from "~/utils/context.server";
import { EmailSchema } from "~/utils/userValidation";
import { apiAddEmail } from "~/utils/api-client.server";
import type { Route } from "./+types/email.send-verification";

const AddEmailSchema = z.object({
	email: EmailSchema,
});

export const action = async ({ request, context }: Route.ActionArgs) => {
	const existingUser = await requireUserFromContext(context);

	if (!existingUser) {
		return data({ error: "User not found" }, { status: 401 });
	}

	// If user already has an email, return error
	if (existingUser.email) {
		return data({ error: "Email already set" }, { status: 400 });
	}

	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: AddEmailSchema.transform(async (formDataParsed, ctx) => {
			try {
				const apiResponse = await apiAddEmail(request, formDataParsed);
				return { ...formDataParsed, apiResponse };
			} catch (error) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						error instanceof Error ? error.message : "Failed to add email",
					path:
						error instanceof Error && error.message.includes("email")
							? ["email"]
							: [],
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

	const { apiResponse } = submission.value;

	if ("error" in apiResponse) {
		return data({ error: apiResponse.error }, { status: 400 });
	}

	const { verifyUrl } = apiResponse;

	// Return the verification URL so the client can extract the target
	return data({ redirectTo: verifyUrl });
};
