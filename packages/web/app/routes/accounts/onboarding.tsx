import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Box, Heading, Link, Text } from "@radix-ui/themes";
import {
	Form,
	data,
	redirect,
	type unstable_RouterContextProvider,
	useSearchParams,
} from "react-router";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { safeRedirect } from "remix-utils/safe-redirect";
import { z } from "zod";
import CheckboxField from "~/components/forms/CheckboxField";
import ErrorList from "~/components/forms/ErrorList";
import SubmitButton from "~/components/forms/SubmitButton";
import TextInput from "~/components/forms/TextInput";
import Layout from "~/components/nav/Layout";
import WelcomeEmail from "~/emails/Welcome";
import { sendEmail } from "~/utils/email.server";
import { checkHoneypot } from "~/utils/honeypot.server";
import { apiSignupComplete } from "~/utils/api-client.server";
import {
	EmailSchema,
	NameSchema,
	PasswordAndConfirmPasswordSchema,
} from "~/utils/userValidation";
import { verifySessionStorage } from "~/utils/verification.server";
import type { Route } from "./+types/onboarding";
import { requireAnonymousFromContext } from "~/utils/context.server";

export const onboardingEmailSessionKey = "onboardingEmail";

const SignupFormSchema = z
	.object({
		email: EmailSchema,
		name: NameSchema,
		remember: z.boolean().optional(),
		agree: z.boolean(),
		redirectTo: z.string().optional(),
	})
	.and(PasswordAndConfirmPasswordSchema);

/**
 * Gets email address from onboarding session
 * @param request Request object
 * @returns Email address from onboarding session
 */
async function requireOnboardingEmail(
	request: Request,
	context: unstable_RouterContextProvider,
) {
	await requireAnonymousFromContext(context);
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get("cookie"),
	);
	const email = verifySession.get(onboardingEmailSessionKey);
	if (typeof email !== "string" || !email) {
		throw redirect("/accounts/signup");
	}
	return email;
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const email = await requireOnboardingEmail(request, context);
	return { email };
}

export async function action({ request, context }: Route.ActionArgs) {
	const email = await requireOnboardingEmail(request, context);
	const formData = await request.formData();
	checkHoneypot(formData);
	const submission = await parseWithZod(formData, {
		schema: (intent) =>
			SignupFormSchema.transform(async (data, ctx) => {
				if (intent !== null) return { ...data, apiResponse: null };

				try {
					const apiResponse = await apiSignupComplete(request, {
						...data,
						email,
						password: data.password,
					});
					return { ...data, apiResponse };
				} catch (error) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message:
							error instanceof Error
								? error.message
								: "Failed to create account",
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

	const { apiResponse, redirectTo } = submission.value;
	const responseData = await apiResponse.json();

	// Forward the Set-Cookie headers from the API response and clean up verify session
	const headers = new Headers();
	const apiSetCookie = apiResponse.headers.get("set-cookie");
	if (apiSetCookie) {
		headers.append("set-cookie", apiSetCookie);
	}

	// Clear the verification session
	const verifySession = await verifySessionStorage.getSession();
	headers.append(
		"set-cookie",
		await verifySessionStorage.destroySession(verifySession),
	);

	// Send welcome email
	await sendEmail({
		to: email,
		subject: "Welcome to Sill!",
		"o:tag": "welcome",
		react: <WelcomeEmail name={String(formData.get("name"))} />,
	});

	// Use the redirect URL from the API response or form data
	const finalRedirectTo =
		(responseData && "redirectTo" in responseData
			? responseData.redirectTo
			: undefined) ||
		redirectTo ||
		"/accounts/onboarding/social";

	return redirect(safeRedirect(finalRedirectTo), { headers });
}

export const meta: Route.MetaFunction = () => {
	return [{ title: "Sill | Setup your account" }];
};

const PrivacyLabel = () => (
	<Text>
		You agree to the{" "}
		<Link href="https://terms.sill.social/terms.html">
			Terms and Conditions
		</Link>{" "}
		and the{" "}
		<Link href="https://terms.sill.social/privacy.html">Privacy Policy</Link>.
	</Text>
);

export default function OnboardingRoute({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { email } = loaderData;
	const [searchParams] = useSearchParams();
	const redirectTo =
		searchParams.get("redirectTo") || "/accounts/onboarding/social";

	const [form, fields] = useForm({
		id: "onboarding-form",
		constraint: getZodConstraint(SignupFormSchema),
		defaultValue: { redirectTo },
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SignupFormSchema });
		},
		shouldRevalidate: "onBlur",
	});

	return (
		<Layout hideNav>
			<Box mb="5">
				<Heading size="8">Welcome</Heading>
				<Text as="p">Please enter your account details.</Text>
			</Box>
			<Form method="post" {...getFormProps(form)}>
				<HoneypotInputs />
				<ErrorList errors={form.errors} id={form.errorId} />
				<TextInput
					labelProps={{
						htmlFor: fields.email.id,
						children: "Email",
					}}
					inputProps={{
						...getInputProps(fields.email, { type: "email" }),
						readOnly: true,
						value: email,
					}}
					errors={fields.email.errors}
				/>
				<TextInput
					labelProps={{
						htmlFor: fields.name.id,
						children: "Name",
					}}
					inputProps={{
						...getInputProps(fields.name, { type: "text" }),
					}}
					errors={fields.name.errors}
				/>
				<TextInput
					labelProps={{
						htmlFor: fields.password.id,
						children: "Password",
					}}
					inputProps={{
						...getInputProps(fields.password, { type: "password" }),
					}}
					errors={fields.password.errors}
				/>
				<TextInput
					labelProps={{
						htmlFor: fields.confirmPassword.id,
						children: "Confirm password",
					}}
					inputProps={{
						...getInputProps(fields.confirmPassword, { type: "password" }),
					}}
					errors={fields.confirmPassword.errors}
				/>

				<Box mb="5">
					<CheckboxField
						labelProps={{
							htmlFor: fields.remember.id,
							children: "Remember me?",
						}}
						inputProps={{
							id: fields.remember.id,
							name: fields.remember.name,
						}}
						errors={fields.remember.errors}
					/>
				</Box>

				<Box mb="5">
					<CheckboxField
						labelProps={{
							htmlFor: fields.agree.id,
							children: <PrivacyLabel />,
						}}
						inputProps={{
							id: fields.agree.id,
							name: fields.agree.name,
						}}
						errors={fields.agree.errors}
					/>
				</Box>

				<input {...getInputProps(fields.redirectTo, { type: "hidden" })} />

				<div className="flex items-center justify-between gap-6">
					<SubmitButton label="Create an account" />
				</div>
			</Form>
		</Layout>
	);
}
