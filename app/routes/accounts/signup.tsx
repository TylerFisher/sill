import type { Route } from "./+types/signup";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Box, Heading } from "@radix-ui/themes";
import { Form, data, redirect } from "react-router";
import { eq } from "drizzle-orm";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { z } from "zod";
import ErrorList from "~/components/forms/ErrorList";
import SubmitButton from "~/components/forms/SubmitButton";
import TextInput from "~/components/forms/TextInput";
import Layout from "~/components/nav/Layout";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import Verify from "~/emails/verify";
import { sendEmail } from "~/utils/email.server";
import { checkHoneypot } from "~/utils/honeypot.server";
import { EmailSchema } from "~/utils/userValidation";
import { prepareVerification } from "~/utils/verify.server";

export const meta: Route.MetaFunction = () => [{ title: "Sill | Sign up" }];

export const SignupSchema = z.object({
	email: EmailSchema,
});

export const action = async ({ request }: Route.ActionArgs) => {
	const formData = await request.formData();
	checkHoneypot(formData);
	const submission = await parseWithZod(formData, {
		schema: SignupSchema.superRefine(async (data, ctx) => {
			const existingUser = await db.query.user.findFirst({
				where: eq(user.email, data.email),
				columns: { id: true },
			});
			if (existingUser) {
				ctx.addIssue({
					path: ["email"],
					code: z.ZodIssueCode.custom,
					message: "A user already exists with this email",
				});
				return;
			}
		}),
		async: true,
	});

	if (submission.status !== "success") {
		// If validation fails, return errors
		return data(
			{ result: submission.reply() },
			{
				status: submission.status === "error" ? 400 : 200,
			},
		);
	}

	const { email } = submission.value;
	const { redirectTo, otp } = await prepareVerification({
		period: 10 * 60,
		request,
		type: "onboarding",
		target: email,
	});

	const response = await sendEmail({
		to: email,
		subject: "Verify your email",
		react: <Verify otp={otp} />,
	});

	if (response.status !== 200) {
		return data(
			{
				result: submission.reply({
					formErrors: [String(response.message)],
				}),
			},
			{
				status: 500,
			},
		);
	}
	return redirect(redirectTo.toString()) as never;
};

const UserSetup = ({ actionData }: Route.ComponentProps) => {
	const [form, fields] = useForm({
		// Sync the result of last submission
		lastResult: actionData?.result,

		// Reuse the validation logic on the client
		onValidate({ formData }) {
			const result = parseWithZod(formData, { schema: SignupSchema });
			return result;
		},
		// Validate the form on blur event triggered
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
	});

	return (
		<Layout hideNav>
			<Box mb="5">
				<Heading size="8">Sign up</Heading>
			</Box>

			<Form method="post" {...getFormProps(form)}>
				<HoneypotInputs />
				<ErrorList errors={form.errors} id={form.errorId} />
				<TextInput
					labelProps={{
						htmlFor: fields.email.name,
						children: "Email address",
					}}
					inputProps={{
						...getInputProps(fields.email, { type: "email" }),
						placeholder: "your@email.com",
					}}
					errors={fields.email.errors}
				/>
				<SubmitButton label="Sign up" />
			</Form>
		</Layout>
	);
};

export default UserSetup;
