import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Badge, Box, Heading, Text } from "@radix-ui/themes";
import { Form, data, redirect } from "react-router";
import { z } from "zod";
import ErrorList from "~/components/forms/ErrorList";
import SubmitButton from "~/components/forms/SubmitButton";
import TextInput from "~/components/forms/TextInput.js";
import Layout from "~/components/nav/Layout";
import { EmailSchema } from "~/utils/userValidation";
import { verifySessionStorage } from "~/utils/verification.server";
import type { Route } from "./+types/change-email";
import { invariantResponse } from "@epic-web/invariant";
import { requireUserFromContext } from "~/utils/context.server";
import { apiChangeEmail } from "~/utils/api-client.server";

export const newEmailAddressSessionKey = "new-email-address";

const ChangeEmailSchema = z.object({
	email: EmailSchema,
});

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Change your email" },
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const existingUser = await requireUserFromContext(context);
	invariantResponse(existingUser, "User not found", { status: 404 });
	return { user: existingUser };
}

export async function action({ request, context }: Route.ActionArgs) {
	const existingUser = await requireUserFromContext(context);

	if (!existingUser) {
		throw new Error("User not found");
	}
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: ChangeEmailSchema.transform(async (data, ctx) => {
			try {
				const apiResponse = await apiChangeEmail(request, data);
				return { ...data, apiResponse };
			} catch (error) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						error instanceof Error
							? error.message
							: "Failed to initiate email change",
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

	const { apiResponse } = submission.value;

	if ("error" in apiResponse) {
		throw new Error(apiResponse.error);
	}

	const { verifyUrl, newEmail } = apiResponse;

	// Store the new email address in the session for verification
	const verifySession = await verifySessionStorage.getSession();
	verifySession.set(newEmailAddressSessionKey, newEmail);
	
	// Redirect to verification page
	return redirect(new URL(verifyUrl).pathname + new URL(verifyUrl).search, {
		headers: {
			"set-cookie": await verifySessionStorage.commitSession(verifySession),
		},
	});
}

export default function ChangeEmailIndex({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const [form, fields] = useForm({
		id: "change-email-form",
		constraint: getZodConstraint(ChangeEmailSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ChangeEmailSchema });
		},
	});

	return (
		<Layout>
			<Box>
				<Box mb="5">
					<Heading as="h2" mb="4">
						Change your email
					</Heading>
					<Text as="p">
						You will receive an email at the new email address to confirm.
					</Text>
					<Text as="p">
						An email notice will also be sent to your old address:{" "}
						<Badge>{loaderData.user.email}</Badge>.
					</Text>
				</Box>

				<Form method="POST" {...getFormProps(form)}>
					<ErrorList errors={form.errors} id={form.errorId} />
					<TextInput
						labelProps={{ children: "New Email" }}
						inputProps={{
							...getInputProps(fields.email, { type: "email" }),
							autoComplete: "email",
						}}
						errors={fields.email.errors}
					/>
					<div>
						<SubmitButton label="Send confirmation" />
					</div>
				</Form>
			</Box>
		</Layout>
	);
}
