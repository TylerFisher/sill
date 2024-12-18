import { render } from "@react-email/components";
import type { ReactElement } from "react";
import Mailgun from "mailgun.js";
import formData from "form-data";
import { z } from "zod";

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
	username: "api",
	key: process.env.MAILGUN_API_KEY || "",
});

const resendErrorSchema = z.union([
	z.object({
		name: z.string(),
		message: z.string(),
		statusCode: z.number(),
	}),
	z.object({
		name: z.literal("UnknownError"),
		message: z.literal("Unknown Error"),
		statusCode: z.literal(500),
		cause: z.any(),
	}),
]);
type ResendError = z.infer<typeof resendErrorSchema>;
const resendSuccessSchema = z.object({
	id: z.string(),
});

/**
 * Sends an email using the Mailgun API
 * @returns Mailgun API response
 */
export async function sendEmail({
	react,
	...options
}: {
	to: string;
	subject: string;
} & (
	| { html: string; text: string; react?: never }
	| { react: ReactElement; html?: never; text?: never }
)) {
	const from = "Sill <noreply@mail.sill.social>";
	// const from = "Sill <noreply@e.sill.social>";

	const email = {
		from,
		...options,
		...(react ? await renderReactEmail(react) : null),
		// template: "",
	};

	// feel free to remove this condition once you've set up Mailgun
	// if (!process.env.MAILGUN_API_KEY) {
	// 	console.error("MAILGUN_API_KEY not set and we're not in mocks mode.");
	// 	console.error(
	// 		"To send emails, set the MAILGUN_API_KEY environment variable.",
	// 	);
	// 	console.error(
	// 		"Would have sent the following email:",
	// 		JSON.stringify(email),
	// 	);
	// 	return {
	// 		status: "200",
	// 		id: "mock",
	// 		message: email,
	// 	} as const;
	// }

	// const resp = await mg.messages.create("e.sill.social", email);
	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		body: JSON.stringify(email),
		headers: {
			Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
			"Content-Type": "application/json",
		},
	});
	const data = await response.json();
	console.log(data);
	const parsedData = resendSuccessSchema.safeParse(data);
	if (response.ok && parsedData.success) {
		return {
			status: "success",
			data: parsedData,
		} as const;
	}
	const parseResult = resendErrorSchema.safeParse(data);
	if (parseResult.success) {
		return {
			status: "error",
			error: parseResult.data,
		} as const;
	}

	return {
		status: "error",
		error: {
			name: "UnknownError",
			message: "Unknown Error",
			statusCode: 500,
			cause: data,
		} satisfies ResendError,
	} as const;
	// return resp;
}

/**
 * Renders a React element into HTML and plain text email content
 * @param react React element to render
 * @returns HTML and plain text email content
 */
export async function renderReactEmail(react: ReactElement) {
	const [html, text] = await Promise.all([
		render(react),
		render(react, { plainText: true }),
	]);
	return { html, text };
}
