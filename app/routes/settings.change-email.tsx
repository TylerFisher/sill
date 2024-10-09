import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import {
	json,
	redirect,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { z } from "zod";
import {
	prepareVerification,
	requireRecentVerification,
} from "~/routes/accounts.verify.server";
import { requireUserId } from "~/utils/auth.server";
import { prisma } from "~/db.server";
import { sendEmail } from "~/utils/email.server";
import { EmailSchema } from "~/utils/userValidation";
import { verifySessionStorage } from "~/utils/verification.server";
import EmailChange from "~/emails/emailChange";
import { Box, Button, Text } from "@radix-ui/themes";
import TextInput from "~/components/TextInput.js";
import ErrorList from "~/components/ErrorList";

export const newEmailAddressSessionKey = "new-email-address";

const ChangeEmailSchema = z.object({
	email: EmailSchema,
});

export async function loader({ request }: LoaderFunctionArgs) {
	await requireRecentVerification(request);
	const userId = await requireUserId(request);
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { email: true },
	});
	if (!user) {
		const params = new URLSearchParams({ redirectTo: request.url });
		throw redirect(`/login?${params}`);
	}
	return json({ user });
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request);
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: ChangeEmailSchema.superRefine(async (data, ctx) => {
			const existingUser = await prisma.user.findUnique({
				where: { email: data.email },
			});
			if (existingUser) {
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
		return json(
			{ result: submission.reply() },
			{ status: submission.status === "error" ? 400 : 200 },
		);
	}
	const { otp, redirectTo, verifyUrl } = await prepareVerification({
		period: 10 * 60,
		request,
		target: userId,
		type: "change-email",
	});

	const response = await sendEmail({
		to: submission.value.email,
		subject: "Sill Email Change Notification",
		react: <EmailChange verifyUrl={verifyUrl.toString()} otp={otp} />,
	});

	if (response.status === "success") {
		const verifySession = await verifySessionStorage.getSession();
		verifySession.set(newEmailAddressSessionKey, submission.value.email);
		return redirect(redirectTo.toString(), {
			headers: {
				"set-cookie": await verifySessionStorage.commitSession(verifySession),
			},
		});
	}
	return json(
		{ result: submission.reply({ formErrors: [response.error.message] }) },
		{ status: 500 },
	);
}

export default function ChangeEmailIndex() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	const [form, fields] = useForm({
		id: "change-email-form",
		constraint: getZodConstraint(ChangeEmailSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ChangeEmailSchema });
		},
	});

	return (
		<Box>
			<Box mb="5">
				<Text as="p">
					You will receive an email at the new email address to confirm.
				</Text>
				<Text as="p">
					An email notice will also be sent to your old address{" "}
					{data.user.email}.
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
					<Button type="submit">Send Confirmation</Button>
				</div>
			</Form>
		</Box>
	);
}
