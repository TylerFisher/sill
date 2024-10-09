import {
	type ActionFunctionArgs,
	type MetaFunction,
	json,
	redirect,
} from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { Heading, Text, Button, Box, Flex } from "@radix-ui/themes";
import { Resend } from "resend";
import { z } from "zod";
import { parseWithZod } from "@conform-to/zod";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { EmailSchema } from "~/utils/userValidation";
import Layout from "~/components/Layout";
import Verify from "~/emails/verify";
import TextInput from "~/components/TextInput";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { checkHoneypot } from "~/utils/honeypot.server";
import { prisma } from "~/db.server";
import { prepareVerification } from "./accounts.verify.server";
import { sendEmail } from "~/utils/email.server";

export const meta: MetaFunction = () => [{ title: "Create account" }];

const SignupSchema = z.object({
	email: EmailSchema,
});

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = await request.formData();
	checkHoneypot(formData);
	const submission = await parseWithZod(formData, {
		schema: SignupSchema.superRefine(async (data, ctx) => {
			const existingUser = await prisma.user.findUnique({
				where: {
					email: data.email,
				},
				select: { id: true },
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
		return json(
			{ result: submission.reply() },
			{
				status: submission.status === "error" ? 400 : 200,
			},
		);
	}

	const { email } = submission.value;
	const { verifyUrl, redirectTo, otp } = await prepareVerification({
		period: 10 * 60,
		request,
		type: "onboarding",
		target: email,
	});

	const response = await sendEmail({
		to: email,
		subject: "Verify your email",
		react: <Verify link={verifyUrl.toString()} otp={otp} />,
	});

	if (response.error) {
		return json(
			{
				result: submission.reply({ formErrors: [response.error.message] }),
			},
			{
				status: 500,
			},
		);
	}
	return redirect(redirectTo.toString());
};

const UserSetup = () => {
	const actionData = useActionData<typeof action>();
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
		<Layout>
			<Box mb="5">
				<Heading size="8">Sign up</Heading>
			</Box>

			<Form method="post" {...getFormProps(form)}>
				<HoneypotInputs />
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
				<Button type="submit" size="3">
					Submit
				</Button>
			</Form>
		</Layout>
	);
};

export default UserSetup;
