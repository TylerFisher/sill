import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Box, Heading, Text } from "@radix-ui/themes";
import { eq } from "drizzle-orm";
import {
	Form,
	data,
	redirect,
	type unstable_RouterContextProvider,
} from "react-router";
import ErrorList from "~/components/forms/ErrorList";
import SubmitButton from "~/components/forms/SubmitButton";
import TextInput from "~/components/forms/TextInput";
import Layout from "~/components/nav/Layout";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { resetUserPassword } from "~/utils/auth.server";
import { PasswordAndConfirmPasswordSchema } from "~/utils/userValidation";
import { verifySessionStorage } from "~/utils/verification.server";
import type { Route } from "./+types/reset-password";
import { requireAnonymousFromContext } from "~/utils/context.server";

export const resetPasswordEmailSessionKey = "resetPasswordEmail";

const ResetPasswordSchema = PasswordAndConfirmPasswordSchema;

/**
 * Requires the reset password email from the session, otherwise redirects to login
 * @param request Request object
 * @returns Email from reset password session
 */
async function requireResetPasswordEmail(
	request: Request,
	context: unstable_RouterContextProvider,
) {
	await requireAnonymousFromContext(context);
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get("cookie"),
	);
	const resetPasswordEmail = verifySession.get(resetPasswordEmailSessionKey);
	if (typeof resetPasswordEmail !== "string" || !resetPasswordEmail) {
		throw redirect("/accounts/login");
	}
	return resetPasswordEmail;
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const resetPasswordEmail = await requireResetPasswordEmail(request, context);
	return { resetPasswordEmail };
}

export async function action({ request, context }: Route.ActionArgs) {
	const resetPasswordEmail = await requireResetPasswordEmail(request, context);
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

export const meta: Route.MetaFunction = () => {
	return [{ title: "Sill | Reset Password" }];
};

export default function ResetPasswordPage({
	loaderData,
	actionData,
}: Route.ComponentProps) {
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
					Hi, {loaderData.resetPasswordEmail}. No worries. It happens all the
					time.
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
				<SubmitButton label="Reset Password " />
			</Form>
		</Layout>
	);
}
