import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Button, Flex, Heading } from "@radix-ui/themes";
import { eq } from "drizzle-orm";
import { Form, Link, data, redirect } from "react-router";
import { z } from "zod";
import ErrorList from "~/components/forms/ErrorList";
import SubmitButton from "~/components/forms/SubmitButton";
import TextInput from "~/components/forms/TextInput";
import Layout from "~/components/nav/Layout";
import { db } from "~/drizzle/db.server";
import { password } from "~/drizzle/schema.server";
import {
	getPasswordHash,
	requireUserId,
	verifyUserPassword,
} from "~/utils/auth.server";
import { PasswordSchema } from "~/utils/userValidation";
import type { Route } from "./+types/password";

const ChangePasswordForm = z
	.object({
		currentPassword: PasswordSchema,
		newPassword: PasswordSchema,
		confirmNewPassword: PasswordSchema,
	})
	.superRefine(({ confirmNewPassword, newPassword }, ctx) => {
		if (confirmNewPassword !== newPassword) {
			ctx.addIssue({
				path: ["confirmNewPassword"],
				code: z.ZodIssueCode.custom,
				message: "The passwords must match",
			});
		}
	});

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Change your password" },
];

export async function loader({ request }: Route.LoaderArgs) {
	await requireUserId(request);
	return {};
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request);
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		async: true,
		schema: ChangePasswordForm.superRefine(
			async ({ currentPassword, newPassword }, ctx) => {
				if (currentPassword && newPassword) {
					const user = await verifyUserPassword({ userId }, currentPassword);
					if (!user) {
						ctx.addIssue({
							path: ["currentPassword"],
							code: z.ZodIssueCode.custom,
							message: "Incorrect password.",
						});
					}
				}
			},
		),
	});
	if (submission.status !== "success") {
		return data(
			{
				result: submission.reply({
					hideFields: ["currentPassword", "newPassword", "confirmNewPassword"],
				}),
			},
			{ status: submission.status === "error" ? 400 : 200 },
		);
	}

	const { newPassword } = submission.value;

	await db
		.update(password)
		.set({
			hash: await getPasswordHash(newPassword),
		})
		.where(eq(password.userId, userId));

	return redirect("/settings", { status: 302 }) as never;
}

export default function ChangePasswordRoute({
	actionData,
}: Route.ComponentProps) {
	const [form, fields] = useForm({
		id: "password-change-form",
		constraint: getZodConstraint(ChangePasswordForm),
		// @ts-ignore: This can only happen in the case of an error
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ChangePasswordForm });
		},
		shouldRevalidate: "onBlur",
	});

	return (
		<Layout>
			<Heading as="h2" mb="4">
				Change password
			</Heading>
			<Form method="POST" {...getFormProps(form)} className="mx-auto max-w-md">
				<ErrorList errors={form.errors} id={form.errorId} />
				<TextInput
					labelProps={{ children: "Current Password" }}
					inputProps={{
						...getInputProps(fields.currentPassword, { type: "password" }),
						autoComplete: "current-password",
					}}
					errors={fields.currentPassword.errors}
				/>
				<TextInput
					labelProps={{ children: "New Password" }}
					inputProps={{
						...getInputProps(fields.newPassword, { type: "password" }),
						autoComplete: "new-password",
					}}
					errors={fields.newPassword.errors}
				/>
				<TextInput
					labelProps={{ children: "Confirm New Password" }}
					inputProps={{
						...getInputProps(fields.confirmNewPassword, {
							type: "password",
						}),
						autoComplete: "new-password",
					}}
					errors={fields.confirmNewPassword.errors}
				/>
				<Flex gap="6">
					<Button asChild variant="soft">
						<Link to="/settings">Cancel</Link>
					</Button>
					<SubmitButton label="Change Password" />
				</Flex>
			</Form>
		</Layout>
	);
}
