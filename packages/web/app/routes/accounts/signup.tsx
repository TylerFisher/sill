import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Box, Heading, Link as RLink, Text } from "@radix-ui/themes";
import { Form, Link, data, redirect } from "react-router";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { z } from "zod";
import ErrorList from "~/components/forms/ErrorList";
import SubmitButton from "~/components/forms/SubmitButton";
import TextInput from "~/components/forms/TextInput";
import Layout from "~/components/nav/Layout";
import Verify from "~/emails/verify";
import { apiSignupInitiate } from "~/utils/api-client.server";
import { sendEmail } from "~/utils/email.server";
import { checkHoneypot } from "~/utils/honeypot.server";
import { EmailSchema } from "~/utils/userValidation";
import type { Route } from "./+types/signup";
import { requireAnonymousFromContext } from "~/utils/context.server";

export const meta: Route.MetaFunction = () => [{ title: "Sill | Sign up" }];

export const SignupSchema = z.object({
	email: EmailSchema,
});

export async function loader({ context }: Route.LoaderArgs) {
	await requireAnonymousFromContext(context);
	return {};
}

export const action = async ({ request, context }: Route.ActionArgs) => {
	await requireAnonymousFromContext(context);
	const formData = await request.formData();
	checkHoneypot(formData);
	const submission = await parseWithZod(formData, {
		schema: SignupSchema.transform(async (data, ctx) => {
			try {
				const apiResponse = await apiSignupInitiate(request, data);
				return { ...data, apiResponse };
			} catch (error) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						error instanceof Error
							? error.message
							: "Failed to initiate signup",
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

	const { email, apiResponse } = submission.value;
	const { otp, verifyUrl } = apiResponse;

	// Send verification email
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
			{ status: 500 },
		);
	}

	// Redirect to verification page
	return redirect(new URL(verifyUrl).pathname + new URL(verifyUrl).search);
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
			<Box mt="5">
				<Text size="2">Already have an account? </Text>
				<RLink asChild>
					<Link to="/accounts/login">
						<Text size="2">Log in</Text>
					</Link>
				</RLink>
				.
			</Box>
		</Layout>
	);
};

export default UserSetup;
