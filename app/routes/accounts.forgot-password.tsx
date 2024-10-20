import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import {
	json,
	redirect,
	type ActionFunctionArgs,
	type MetaFunction,
} from "@remix-run/node";
import { Form, Link, useFetcher } from "@remix-run/react";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { sendEmail } from "~/utils/email.server";
import { checkHoneypot } from "~/utils/honeypot.server";
import { EmailSchema, UsernameSchema } from "~/utils/userValidation";
import { prepareVerification } from "./accounts.verify.server";
import ForgotPasswordEmail from "~/emails/forgotPassword";
import Layout from "~/components/Layout";
import { Box, Button, Heading, Text } from "@radix-ui/themes";
import TextInput from "~/components/TextInput";
import ErrorList from "~/components/ErrorList";

const ForgotPasswordSchema = z.object({
	usernameOrEmail: z.union([EmailSchema, UsernameSchema]),
});

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	checkHoneypot(formData);
	const submission = await parseWithZod(formData, {
		schema: ForgotPasswordSchema.superRefine(async (data, ctx) => {
			const existingUser = await db.query.user.findFirst({
				where: or(
					eq(user.email, usernameOrEmail),
					eq(user.username, usernameOrEmail),
				),
				columns: { id: true },
			});
			if (!existingUser) {
				ctx.addIssue({
					path: ["usernameOrEmail"],
					code: z.ZodIssueCode.custom,
					message: "No user exists with this username or email",
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
	const { usernameOrEmail } = submission.value;

	const existingUser = await db.query.user.findFirst({
		where: or(
			eq(user.email, usernameOrEmail),
			eq(user.username, usernameOrEmail),
		),
		columns: { email: true, username: true },
	});

	if (!existingUser) {
		throw new Error("Something went wrong");
	}

	const { verifyUrl, redirectTo, otp } = await prepareVerification({
		period: 10 * 60,
		request,
		type: "reset-password",
		target: usernameOrEmail,
	});

	const response = await sendEmail({
		to: existingUser.email,
		subject: "Sill Password Reset",
		react: (
			<ForgotPasswordEmail onboardingUrl={verifyUrl.toString()} otp={otp} />
		),
	});

	if (response.status === "success") {
		return redirect(redirectTo.toString());
	}
	return json(
		{ result: submission.reply({ formErrors: [response.error.message] }) },
		{ status: 500 },
	);
}

export const meta: MetaFunction = () => {
	return [{ title: "Password Recovery for Epic Notes" }];
};

export default function ForgotPasswordRoute() {
	const forgotPassword = useFetcher<typeof action>();

	const [form, fields] = useForm({
		id: "forgot-password-form",
		constraint: getZodConstraint(ForgotPasswordSchema),
		lastResult: forgotPassword.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ForgotPasswordSchema });
		},
		shouldRevalidate: "onBlur",
	});

	return (
		<Layout>
			<Box mb="6">
				<Heading size="8" mb="3">
					Forgot your password?
				</Heading>
				<Text as="p" size="3">
					No worries, we'll send you reset instructions
				</Text>
			</Box>

			<Form method="POST" {...getFormProps(form)}>
				<HoneypotInputs />
				<ErrorList errors={form.errors} id={form.errorId} />
				<TextInput
					labelProps={{
						htmlFor: fields.usernameOrEmail.id,
						children: "Username or Email",
					}}
					inputProps={{
						...getInputProps(fields.usernameOrEmail, { type: "text" }),
					}}
					errors={fields.usernameOrEmail.errors}
				/>
				<Box mb="5">
					<Button type="submit">Reset password</Button>
				</Box>
				<Link
					to="/accounts/login"
					className="mt-11 text-center text-body-sm font-bold"
				>
					Back to Login
				</Link>
			</Form>
		</Layout>
	);
}
