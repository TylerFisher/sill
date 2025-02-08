import type { Route } from "./+types/onboarding";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Box, Heading, Link, Text } from "@radix-ui/themes";
import { data, redirect, Form, useSearchParams } from "react-router";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { safeRedirect } from "remix-utils/safe-redirect";
import { z } from "zod";
import CheckboxField from "~/components/forms/CheckboxField";
import ErrorList from "~/components/forms/ErrorList";
import SubmitButton from "~/components/forms/SubmitButton";
import TextInput from "~/components/forms/TextInput";
import Layout from "~/components/nav/Layout";
import WelcomeEmail from "~/emails/Welcome";
import { requireAnonymous, sessionKey, signup } from "~/utils/auth.server";
import { sendEmail } from "~/utils/email.server";
import { checkHoneypot } from "~/utils/honeypot.server";
import { authSessionStorage } from "~/utils/session.server";
import {
	EmailSchema,
	NameSchema,
	PasswordAndConfirmPasswordSchema,
} from "~/utils/userValidation";
import { verifySessionStorage } from "~/utils/verification.server";

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
async function requireOnboardingEmail(request: Request) {
	await requireAnonymous(request);
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get("cookie"),
	);
	const email = verifySession.get(onboardingEmailSessionKey);
	if (typeof email !== "string" || !email) {
		throw redirect("/accounts/signup");
	}
	return email;
}

export async function loader({ request }: Route.LoaderArgs) {
	const email = await requireOnboardingEmail(request);
	return { email };
}

export async function action({ request }: Route.ActionArgs) {
	const email = await requireOnboardingEmail(request);
	const formData = await request.formData();
	checkHoneypot(formData);
	const submission = await parseWithZod(formData, {
		schema: (intent) =>
			SignupFormSchema.transform(async (data) => {
				if (intent !== null) return { ...data, session: null };

				const session = await signup({
					...data,
					email,
					sentPassword: data.password,
				});
				return { ...data, session };
			}),
		async: true,
	});

	if (submission.status !== "success" || !submission.value.session) {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === "error" ? 400 : 200 },
		);
	}

	const { session, remember, redirectTo } = submission.value;

	const authSession = await authSessionStorage.getSession(
		request.headers.get("cookie"),
	);
	authSession.set(sessionKey, session.id);
	const verifySession = await verifySessionStorage.getSession();
	const headers = new Headers();
	headers.append(
		"set-cookie",
		await authSessionStorage.commitSession(authSession, {
			expires: remember ? session.expirationDate : undefined,
		}),
	);
	headers.append(
		"set-cookie",
		await verifySessionStorage.destroySession(verifySession),
	);

	await sendEmail({
		to: email,
		subject: "Welcome to Sill!",
		"o:tag": "welcome",
		react: <WelcomeEmail name={String(formData.get("name"))} />,
	});

	return redirect(safeRedirect(redirectTo), { headers }) as never;
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
		searchParams.get("redirectTo") || "/connect?onboarding=true";

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
