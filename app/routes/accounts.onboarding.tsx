import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import {
	json,
	redirect,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	type MetaFunction,
} from "@vercel/remix";
import {
	Form,
	useActionData,
	useLoaderData,
	useSearchParams,
} from "@remix-run/react";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { safeRedirect } from "remix-utils/safe-redirect";
import { z } from "zod";
import { requireAnonymous, sessionKey, signup } from "~/utils/auth.server";
import { db } from "~/drizzle/db.server";
import { checkHoneypot } from "~/utils/honeypot.server";
import { authSessionStorage } from "~/utils/session.server";
import {
	NameSchema,
	PasswordAndConfirmPasswordSchema,
} from "~/utils/userValidation";
import { verifySessionStorage } from "~/utils/verification.server";
import { Box, Button, Heading, Text } from "@radix-ui/themes";
import Layout from "~/components/nav/Layout";
import TextInput from "~/components/forms/TextInput";
import CheckboxField from "~/components/forms/CheckboxField";
import ErrorList from "~/components/forms/ErrorList";
import { eq } from "drizzle-orm";
import { user } from "~/drizzle/schema.server";

export const onboardingEmailSessionKey = "onboardingEmail";

const SignupFormSchema = z
	.object({
		name: NameSchema,
		agreeToTermsOfServiceAndPrivacyPolicy: z.boolean({
			required_error:
				"You must agree to the terms of service and privacy policy",
		}),
		remember: z.boolean().optional(),
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
		throw redirect("/signup");
	}
	return email;
}

export async function loader({ request }: LoaderFunctionArgs) {
	const email = await requireOnboardingEmail(request);
	return json({ email });
}

export async function action({ request }: ActionFunctionArgs) {
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
		return json(
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

	return redirect(safeRedirect(redirectTo), { headers });
}

export const meta: MetaFunction = () => {
	return [{ title: "Setup Sill Account" }];
};

export default function OnboardingRoute() {
	const actionData = useActionData<typeof action>();
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
						htmlFor: fields.name.name,
						children: "Name",
					}}
					inputProps={{
						...getInputProps(fields.name, { type: "text" }),
					}}
					errors={fields.name.errors}
				/>
				<TextInput
					labelProps={{
						htmlFor: fields.password.name,
						children: "Password",
					}}
					inputProps={{
						...getInputProps(fields.password, { type: "password" }),
					}}
					errors={fields.password.errors}
				/>
				<TextInput
					labelProps={{
						htmlFor: fields.confirmPassword.name,
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
							htmlFor: fields.agreeToTermsOfServiceAndPrivacyPolicy.name,
							children:
								"Do you agree to our Terms of Service and Privacy Policy?",
						}}
						inputProps={{
							id: fields.agreeToTermsOfServiceAndPrivacyPolicy.id,
							name: fields.agreeToTermsOfServiceAndPrivacyPolicy.name,
						}}
						errors={fields.agreeToTermsOfServiceAndPrivacyPolicy.errors}
					/>
				</Box>
				<Box mb="5">
					<CheckboxField
						labelProps={{
							htmlFor: fields.remember.name,
							children: "Remember me?",
						}}
						inputProps={{
							id: fields.remember.id,
							name: fields.remember.name,
						}}
						errors={fields.remember.errors}
					/>
				</Box>

				<input {...getInputProps(fields.redirectTo, { type: "hidden" })} />

				<div className="flex items-center justify-between gap-6">
					<Button type="submit">Create an account</Button>
				</div>
			</Form>
		</Layout>
	);
}
