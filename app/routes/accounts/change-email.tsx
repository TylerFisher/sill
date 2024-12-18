import type { Route } from "./+types/change-email";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Badge, Box, Heading, Text } from "@radix-ui/themes";
import { data, redirect, Form } from "react-router";
import { eq } from "drizzle-orm";
import { z } from "zod";
import ErrorList from "~/components/forms/ErrorList";
import SubmitButton from "~/components/forms/SubmitButton";
import TextInput from "~/components/forms/TextInput.js";
import Layout from "~/components/nav/Layout";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import EmailChange from "~/emails/emailChange";
import { requireUserId } from "~/utils/auth.server";
import { sendEmail } from "~/utils/email.server";
import { EmailSchema } from "~/utils/userValidation";
import { verifySessionStorage } from "~/utils/verification.server";
import {
	prepareVerification,
	requireRecentVerification,
} from "~/utils/verify.server";

export const newEmailAddressSessionKey = "new-email-address";

const ChangeEmailSchema = z.object({
	email: EmailSchema,
});

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Change your email" },
];

export async function loader({ request }: Route.LoaderArgs) {
	await requireRecentVerification(request);
	const userId = await requireUserId(request);
	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
		columns: { email: true },
	});
	if (!existingUser) {
		const params = new URLSearchParams({ redirectTo: request.url });
		throw redirect(`/login?${params}`);
	}
	return { user: existingUser };
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request);
	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
	});

	if (!existingUser) {
		throw new Error("User not found");
	}
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: ChangeEmailSchema.superRefine(async (data, ctx) => {
			const userForEmail = await db.query.user.findFirst({
				where: eq(user.email, data.email),
			});
			if (userForEmail) {
				ctx.addIssue({
					path: ["email"],
					code: z.ZodIssueCode.custom,
					message: "This email is already in use.",
				});
			}
		}),
		async: true,
	});

	if (submission.status !== "success") {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === "error" ? 400 : 200 },
		);
	}
	const { otp, redirectTo } = await prepareVerification({
		period: 10 * 60,
		request,
		target: existingUser.email,
		type: "change-email",
	});

	const response = await sendEmail({
		to: submission.value.email,
		subject: "Sill Email Change Notification",
		"o:tag": "change-email",
		react: <EmailChange otp={otp} />,
	});

	if (response.status === 200) {
		const verifySession = await verifySessionStorage.getSession();
		verifySession.set(newEmailAddressSessionKey, submission.value.email);
		return redirect(redirectTo.toString(), {
			headers: {
				"set-cookie": await verifySessionStorage.commitSession(verifySession),
			},
		}) as never;
	}
	return data(
		{
			result: submission.reply({
				formErrors: [String(response.message)],
			}),
		},
		{ status: 500 },
	);
}

export default function ChangeEmailIndex({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const [form, fields] = useForm({
		id: "change-email-form",
		constraint: getZodConstraint(ChangeEmailSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ChangeEmailSchema });
		},
	});

	return (
		<Layout>
			<Box>
				<Box mb="5">
					<Heading as="h2" mb="4">
						Change your email
					</Heading>
					<Text as="p">
						You will receive an email at the new email address to confirm.
					</Text>
					<Text as="p">
						An email notice will also be sent to your old address:{" "}
						<Badge>{loaderData.user.email}</Badge>.
					</Text>
				</Box>

				<Form method="POST" {...getFormProps(form)}>
					<ErrorList errors={form.errors} id={form.errorId} />
					<TextInput
						labelProps={{ children: "New Email" }}
						inputProps={{
							...getInputProps(fields.email, { type: "email" }),
							autoComplete: "email",
						}}
						errors={fields.email.errors}
					/>
					<div>
						<SubmitButton label="Send confirmation" />
					</div>
				</Form>
			</Box>
		</Layout>
	);
}
