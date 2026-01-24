import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Box, Heading, Text } from "@radix-ui/themes";
import { Form, data, redirect } from "react-router";
import { z } from "zod";
import ErrorList from "~/components/forms/ErrorList";
import SubmitButton from "~/components/forms/SubmitButton";
import TextInput from "~/components/forms/TextInput.js";
import Layout from "~/components/nav/Layout";
import { EmailSchema } from "~/utils/userValidation";
import { verifySessionStorage } from "~/utils/verification.server";
import type { Route } from "./+types/add-email";
import { invariantResponse } from "@epic-web/invariant";
import { requireUserFromContext } from "~/utils/context.server";
import { apiAddEmail } from "~/utils/api-client.server";

export const newEmailAddressSessionKey = "new-email-address";
export const addEmailRedirectToSessionKey = "add-email-redirect-to";

const AddEmailSchema = z.object({
	email: EmailSchema,
});

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Add your email" },
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const existingUser = await requireUserFromContext(context);
	invariantResponse(existingUser, "User not found", { status: 404 });

	// If user already has an email, redirect to change-email
	if (existingUser.email) {
		return redirect("/accounts/change-email");
	}

	// Get redirectTo from search params
	const url = new URL(request.url);
	const redirectTo = url.searchParams.get("redirectTo") || "/settings/account";

	return { user: existingUser, redirectTo };
}

export async function action({ request, context }: Route.ActionArgs) {
	const existingUser = await requireUserFromContext(context);

	if (!existingUser) {
		throw new Error("User not found");
	}

	// If user already has an email, redirect to change-email
	if (existingUser.email) {
		return redirect("/accounts/change-email");
	}

	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: AddEmailSchema.transform(async (formDataParsed, ctx) => {
			try {
				const apiResponse = await apiAddEmail(request, formDataParsed);
				return { ...formDataParsed, apiResponse };
			} catch (error) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						error instanceof Error
							? error.message
							: "Failed to add email",
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

	// Get redirectTo from form data
	const redirectTo = formData.get("redirectTo")?.toString() || "/settings/account";

	// Store the new email address and redirect URL in the session for verification
	const verifySession = await verifySessionStorage.getSession();
	verifySession.set(newEmailAddressSessionKey, newEmail);
	verifySession.set(addEmailRedirectToSessionKey, redirectTo);

	// Redirect to verification page
	return redirect(new URL(verifyUrl).pathname + new URL(verifyUrl).search, {
		headers: {
			"set-cookie": await verifySessionStorage.commitSession(verifySession),
		},
	});
}

export default function AddEmailIndex({
	actionData,
	loaderData,
}: Route.ComponentProps) {
	const [form, fields] = useForm({
		id: "add-email-form",
		constraint: getZodConstraint(AddEmailSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: AddEmailSchema });
		},
	});

	return (
		<Layout>
			<Box>
				<Box mb="5">
					<Heading as="h2" mb="4">
						Add your email
					</Heading>
					<Text as="p">
						Add an email address to your account to receive Daily Digests and notifications.
					</Text>
					<Text as="p" mt="2">
						You will receive an email to confirm your address.
					</Text>
				</Box>

				<Form method="POST" {...getFormProps(form)}>
					<ErrorList errors={form.errors} id={form.errorId} />
					<input type="hidden" name="redirectTo" value={loaderData.redirectTo} />
					<TextInput
						labelProps={{ children: "Email" }}
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
