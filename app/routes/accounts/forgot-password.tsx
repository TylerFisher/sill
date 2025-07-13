import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Box, Callout, Heading, Link as RLink, Text } from "@radix-ui/themes";
import { eq } from "drizzle-orm";
import { CircleAlert } from "lucide-react";
import { data, redirect } from "react-router";
import { Form, Link, useFetcher } from "react-router";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { z } from "zod";
import ErrorList from "~/components/forms/ErrorList";
import SubmitButton from "~/components/forms/SubmitButton";
import TextInput from "~/components/forms/TextInput";
import Layout from "~/components/nav/Layout";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import ForgotPasswordEmail from "~/emails/forgotPassword";
import { sendEmail } from "~/utils/email.server";
import { checkHoneypot } from "~/utils/honeypot.server";
import { EmailSchema } from "~/utils/userValidation";
import { prepareVerification } from "~/utils/verify.server";
import type { Route } from "./+types/forgot-password";

const ForgotPasswordSchema = z.object({
	email: EmailSchema,
});

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData();
	checkHoneypot(formData);
	const submission = await parseWithZod(formData, {
		schema: ForgotPasswordSchema.superRefine(async (data, ctx) => {
			const existingUser = await db.query.user.findFirst({
				where: eq(user.email, data.email),
				columns: { id: true },
			});
			if (!existingUser) {
				ctx.addIssue({
					path: ["email"],
					code: z.ZodIssueCode.custom,
					message: "No user exists with this email",
				});
				return;
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
	const { email } = submission.value;

	const existingUser = await db.query.user.findFirst({
		where: eq(user.email, email),
		columns: { email: true },
	});

	if (!existingUser) {
		throw new Error("Something went wrong");
	}

	const { redirectTo, otp } = await prepareVerification({
		period: 10 * 60,
		request,
		type: "reset-password",
		target: email,
	});

	const response = await sendEmail({
		to: existingUser.email,
		subject: "Sill Password Reset",
		"o:tag": "reset-password",
		react: <ForgotPasswordEmail otp={otp} />,
	});

	if (response.status === 200) {
		return redirect(redirectTo.toString()) as never;
	}
	return data(
		{
			result: submission.reply({ formErrors: [String(response.message)] }),
		},
		{ status: 500 },
	);
}

export const meta: Route.MetaFunction = () => {
	return [{ title: "Sill | Forgot your password?" }];
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
		<Layout hideNav>
			<Box mb="6">
				<Heading size="8" mb="3">
					Forgot your password?
				</Heading>
				<Text as="p" size="3">
					No worries, we'll send you reset instructions
				</Text>
			</Box>
			<Box mb="5">
				<Callout.Root color="red">
					<Callout.Icon>
						<CircleAlert />
					</Callout.Icon>
					<Callout.Text>
						Sill recently experienced data loss. If you had a Sill account
						before February 8, 2025, you may need to{" "}
						<RLink asChild>
							<Link to="/accounts/signup">sign up</Link>
						</RLink>{" "}
						again. We apologize for the inconvenience.
					</Callout.Text>
				</Callout.Root>
			</Box>

			<Form method="POST" {...getFormProps(form)}>
				<HoneypotInputs />
				<ErrorList errors={form.errors} id={form.errorId} />
				<TextInput
					labelProps={{
						htmlFor: fields.email.id,
						children: "Email address",
					}}
					inputProps={{
						...getInputProps(fields.email, { type: "text" }),
					}}
					errors={fields.email.errors}
				/>
				<Box mb="5">
					<SubmitButton label="Reset Password" />
				</Box>
				<RLink asChild>
					<Link
						to="/accounts/login"
						className="mt-11 text-center text-body-sm font-bold"
					>
						<Text size="2">Go back to login</Text>
					</Link>
				</RLink>
			</Form>
		</Layout>
	);
}
