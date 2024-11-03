import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Box, Button, Heading, Text } from "@radix-ui/themes";
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type MetaFunction,
	data,
	redirect,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { eq } from "drizzle-orm";
import ErrorList from "~/components/forms/ErrorList";
import TextInput from "~/components/forms/TextInput";
import Layout from "~/components/nav/Layout";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { requireAnonymous, resetUserPassword } from "~/utils/auth.server";
import { PasswordAndConfirmPasswordSchema } from "~/utils/userValidation";
import { verifySessionStorage } from "~/utils/verification.server";

export const resetPasswordEmailSessionKey = "resetPasswordEmail";

const ResetPasswordSchema = PasswordAndConfirmPasswordSchema;

/**
 * Requires the reset password email from the session, otherwise redirects to login
 * @param request Request object
 * @returns Email from reset password session
 */
async function requireResetPasswordEmail(request: Request) {
	await requireAnonymous(request);
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get("cookie"),
	);
	const resetPasswordEmail = verifySession.get(resetPasswordEmailSessionKey);
	if (typeof resetPasswordEmail !== "string" || !resetPasswordEmail) {
		throw redirect("/login");
	}
	return resetPasswordEmail;
}

export async function loader({ request }: LoaderFunctionArgs) {
	const resetPasswordEmail = await requireResetPasswordEmail(request);
	return { resetPasswordEmail };
}

export async function action({ request }: ActionFunctionArgs) {
	const resetPasswordEmail = await requireResetPasswordEmail(request);
	const formData = await request.formData();
	const submission = parseWithZod(formData, {
		schema: ResetPasswordSchema,
	});
	if (submission.status !== "success") {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === "error" ? 400 : 200 },
		);
	}
	const { password } = submission.value;

	const existingUser = await db.query.user.findFirst({
		where: eq(user.email, resetPasswordEmail),
		columns: { id: true },
	});

	if (!existingUser) {
		throw new Error("Something went wrong");
	}

	await resetUserPassword({ userId: existingUser.id, newPassword: password });
	const verifySession = await verifySessionStorage.getSession();
	return redirect("/accounts/login", {
		headers: {
			"set-cookie": await verifySessionStorage.destroySession(verifySession),
		},
	});
}

export const meta: MetaFunction = () => {
	return [{ title: "Reset Password | Epic Notes" }];
};

export default function ResetPasswordPage() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	const [form, fields] = useForm({
		id: "reset-password",
		constraint: getZodConstraint(ResetPasswordSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ResetPasswordSchema });
		},
		shouldRevalidate: "onBlur",
	});

	return (
		<Layout>
			<Box mb="5">
				<Heading size="8" mb="3">
					Password Reset
				</Heading>
				<Text as="p" size="3">
					Hi, {data.resetPasswordEmail}. No worries. It happens all the time.
				</Text>
			</Box>
			<Form method="POST" {...getFormProps(form)}>
				<ErrorList errors={form.errors} id={form.errorId} />
				<TextInput
					labelProps={{
						htmlFor: fields.password.id,
						children: "New Password",
					}}
					inputProps={{
						...getInputProps(fields.password, { type: "password" }),
						autoComplete: "new-password",
						autoFocus: true,
					}}
					errors={fields.password.errors}
				/>
				<TextInput
					labelProps={{
						htmlFor: fields.confirmPassword.id,
						children: "Confirm Password",
					}}
					inputProps={{
						...getInputProps(fields.confirmPassword, { type: "password" }),
						autoComplete: "new-password",
					}}
					errors={fields.confirmPassword.errors}
				/>
				<Button type="submit">Reset password</Button>
			</Form>
		</Layout>
	);
}
