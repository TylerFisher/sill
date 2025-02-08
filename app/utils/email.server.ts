import { render } from "@react-email/components";
import type { ReactElement } from "react";
import Mailgun from "mailgun.js";
import formData from "form-data";

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
	username: "api",
	key: process.env.MAILGUN_API_KEY || "",
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
	"o:tag"?: string;
} & (
	| { html: string; text: string; react?: never }
	| { react: ReactElement; html?: never; text?: never }
)) {
	const from = `Sill <noreply@${process.env.EMAIL_DOMAIN}>`;

	const email = {
		from,
		...options,
		...(react ? await renderReactEmail(react) : null),
		template: "",
	};

	// feel free to remove this condition once you've set up Mailgun
	if (!process.env.MAILGUN_API_KEY || !process.env.EMAIL_DOMAIN) {
		console.error("Email settings not set and we're not in mocks mode.");
		console.error(
			"To send emails, set the MAILGUN_API_KEY and EMAIL_DOMAIN environment variables.",
		);
		console.error(
			"Would have sent the following email:",
			JSON.stringify(email),
		);
		return {
			status: "200",
			id: "mock",
			message: email,
		} as const;
	}

	const resp = await mg.messages.create(process.env.EMAIL_DOMAIN, email);
	return resp;
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
