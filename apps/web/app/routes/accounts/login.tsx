import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
	Box,
	Flex,
	Heading,
	Link as RLink,
	Separator,
	Text,
} from "@radix-ui/themes";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Form, Link, data, redirect, useSearchParams } from "react-router";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { z } from "zod";
import BlueskyAuthForm from "~/components/forms/BlueskyAuthForm";
import CheckboxField from "~/components/forms/CheckboxField";
import ErrorList from "~/components/forms/ErrorList";
import MastodonAuthForm from "~/components/forms/MastodonAuthForm";
import SubmitButton from "~/components/forms/SubmitButton";
import TextInput from "~/components/forms/TextInput";
import Layout from "~/components/nav/Layout";
import { checkHoneypot } from "~/utils/honeypot.server";
import { apiLogin } from "~/utils/api-client.server";
import { EmailSchema, PasswordSchema } from "~/utils/userValidation";
import type { Route } from "./+types/login";
import { requireAnonymousFromContext } from "~/utils/context.server";

export const meta: Route.MetaFunction = () => [{ title: "Sill | Login" }];

const LoginFormSchema = z.object({
	email: EmailSchema,
	password: PasswordSchema,
	redirectTo: z.string().optional(),
	remember: z.boolean().optional(),
});

export async function loader({ context }: Route.LoaderArgs) {
	await requireAnonymousFromContext(context);
	return {};
}

export async function action({ request, context }: Route.ActionArgs) {
	await requireAnonymousFromContext(context);
	const formData = await request.formData();
	checkHoneypot(formData);

	// Store API response outside of form validation
	let apiResponseHeaders: Headers | undefined;

	const submission = await parseWithZod(formData, {
		schema: (intent) =>
			LoginFormSchema.transform(async (data, ctx) => {
				if (intent !== null) return { ...data, apiResponse: null };

				try {
					const response = await apiLogin(request, data);
					apiResponseHeaders = response.headers;
					const apiResponse = await response.json();

					// Check if the API returned an error
					if (!response.ok || "error" in apiResponse) {
						// Add form-level error (no path) for credential errors
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: ("error" in apiResponse ? apiResponse.error : undefined) || "Invalid email or password",
						});
						return z.NEVER;
					}

					return { ...data, apiResponse };
				} catch (error) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message:
							error instanceof Error
								? error.message
								: "Invalid email or password",
					});
					return z.NEVER;
				}
			}),
		async: true,
	});

	if (submission.status !== "success" || !submission.value) {
		return data(
			{ result: submission.reply({ hideFields: ["password"] }) },
			{ status: submission.status === "error" ? 400 : 200 },
		);
	}

	const { apiResponse, redirectTo } = submission.value;

	// Forward the Set-Cookie headers from the API response
	const headers = new Headers();
	const apiSetCookie = apiResponseHeaders?.get("set-cookie");

	if (apiSetCookie) {
		headers.append("set-cookie", apiSetCookie);
	}

	// Use the redirect URL from the API response or the form data
	const finalRedirectTo =
		(apiResponse && "redirectTo" in apiResponse
			? apiResponse.redirectTo
			: undefined) ||
		redirectTo ||
		"/links";

	return redirect(finalRedirectTo, { headers });
}

const Login = ({ actionData }: Route.ComponentProps) => {
	const [searchParams] = useSearchParams();
	const redirectTo = searchParams.get("redirectTo");
	const [emailLoginOpen, setEmailLoginOpen] = useState(false);

	const [form, fields] = useForm({
		id: "login-form",
		constraint: getZodConstraint(LoginFormSchema),
		defaultValue: { redirectTo },
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: LoginFormSchema });
		},
		shouldRevalidate: "onBlur",
	});

	return (
		<Layout hideNav>
			<Box mb="5">
				<Heading size="8">Continue to Sill</Heading>
			</Box>

			{/* Bluesky Login */}
			<BlueskyAuthForm mode="login" searchParams={searchParams} />

			<Flex align="center" gap="3" mb="4" mt="4">
				<Separator style={{ flex: 1 }} />
				<Text size="2" color="gray">
					or
				</Text>
				<Separator style={{ flex: 1 }} />
			</Flex>

			{/* Mastodon Login */}
			<MastodonAuthForm mode="login" searchParams={searchParams} />

			{/* Email/Password Login (Legacy) */}
			<Collapsible.Root open={emailLoginOpen} onOpenChange={setEmailLoginOpen}>
				<Collapsible.Trigger asChild>
					<Flex
						align="center"
						gap="1"
						mt="4"
						style={{ cursor: "pointer" }}
					>
						{emailLoginOpen ? (
							<ChevronDown size={16} color="var(--gray-11)" />
						) : (
							<ChevronRight size={16} color="var(--gray-11)" />
						)}
						<Text size="2" color="gray">
							Log in with email
						</Text>
					</Flex>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<Box pt="4">
						<Form method="post" {...getFormProps(form)}>
							<HoneypotInputs />
							<ErrorList errors={form.errors} id={form.errorId} />
							<TextInput
								labelProps={{
									htmlFor: fields.email.name,
									children: "Email address",
								}}
								inputProps={{
									...getInputProps(fields.email, { type: "email" }),
								}}
								errors={fields.email.errors}
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
							<Box width="100%">
								<Flex
									mb="5"
									align="center"
									justify="between"
									gap="3"
									width="100%"
								>
									<CheckboxField
										labelProps={{
											htmlFor: fields.remember.id,
											children: "Remember me?",
										}}
										inputProps={{
											name: fields.remember.name,
											id: fields.remember.id,
										}}
										errors={fields.remember.errors}
									/>
									<Box>
										<RLink asChild>
											<Link to="/accounts/forgot-password">
												<Text size="2">Forgot password?</Text>
											</Link>
										</RLink>
									</Box>
								</Flex>
							</Box>

							<input
								{...getInputProps(fields.redirectTo, { type: "hidden" })}
							/>

							<SubmitButton
								label="Log in"
								size="3"
								style={{ width: "100%" }}
							/>
						</Form>
					</Box>
				</Collapsible.Content>
			</Collapsible.Root>
		</Layout>
	);
};

export default Login;
