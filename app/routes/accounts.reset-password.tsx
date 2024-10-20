import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Box, Button, Heading, Text } from "@radix-ui/themes";
import {
	json,
	redirect,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type MetaFunction,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { db } from "~/drizzle/db.server";
import ErrorList from "~/components/ErrorList";
import Layout from "~/components/Layout";
import TextInput from "~/components/TextInput";
import { requireAnonymous, resetUserPassword } from "~/utils/auth.server";
import { PasswordAndConfirmPasswordSchema } from "~/utils/userValidation";
import { verifySessionStorage } from "~/utils/verification.server";
import { eq } from "drizzle-orm";
import { user } from "~/drizzle/schema.server";

export const resetPasswordUsernameSessionKey = "resetPasswordUsername";

const ResetPasswordSchema = PasswordAndConfirmPasswordSchema;

/**
 * Requires the reset password username from the session, otherwise redirects to login
 * @param request Request object
 * @returns Username from reset password session
 */
async function requireResetPasswordUsername(request: Request) {
	await requireAnonymous(request);
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get("cookie"),
	);
	const resetPasswordUsername = verifySession.get(
		resetPasswordUsernameSessionKey,
	);
	if (typeof resetPasswordUsername !== "string" || !resetPasswordUsername) {
		throw redirect("/login");
	}
	return resetPasswordUsername;
}

export async function loader({ request }: LoaderFunctionArgs) {
	const resetPasswordUsername = await requireResetPasswordUsername(request);
	return json({ resetPasswordUsername });
}

export async function action({ request }: ActionFunctionArgs) {
	const resetPasswordUsername = await requireResetPasswordUsername(request);
	const formData = await request.formData();
	const submission = parseWithZod(formData, {
		schema: ResetPasswordSchema,
	});
	if (submission.status !== "success") {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === "error" ? 400 : 200 },
		);
	}
	const { password } = submission.value;

	const existingUser = await db.query.user.findFirst({
		where: eq(user.username, resetPasswordUsername),
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
					Hi, {data.resetPasswordUsername}. No worries. It happens all the time.
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
