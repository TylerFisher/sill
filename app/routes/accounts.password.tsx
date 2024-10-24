import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import {
	json,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	redirect,
} from "@remix-run/node";
import { Form, Link, useActionData } from "@remix-run/react";
import { z } from "zod";
import {
	getPasswordHash,
	requireUserId,
	verifyUserPassword,
} from "~/utils/auth.server";
import { db } from "~/drizzle/db.server";
import { PasswordSchema } from "~/utils/userValidation";
import TextInput from "~/components/forms/TextInput";
import { Button, Flex, Heading } from "@radix-ui/themes";
import ErrorList from "~/components/forms/ErrorList";
import { password } from "~/drizzle/schema.server";
import { eq } from "drizzle-orm";
import Layout from "~/components/nav/Layout";

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

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request);
	return json({});
}

export async function action({ request }: ActionFunctionArgs) {
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
		return json(
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

	return redirect("/settings/profile", { status: 302 });
}

export default function ChangePasswordRoute() {
	const actionData = useActionData<typeof action>();

	const [form, fields] = useForm({
		id: "password-change-form",
		constraint: getZodConstraint(ChangePasswordForm),
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
						<Link to="..">Cancel</Link>
					</Button>
					<Button type="submit">Change Password</Button>
				</Flex>
			</Form>
		</Layout>
	);
}
