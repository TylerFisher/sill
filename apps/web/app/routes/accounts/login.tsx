import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import {
	Box,
	Callout,
	Flex,
	Heading,
	Link as RLink,
	Text,
} from "@radix-ui/themes";
import { CircleAlert } from "lucide-react";
import { Form, Link, data, redirect, useSearchParams } from "react-router";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { z } from "zod";
import CheckboxField from "~/components/forms/CheckboxField";
import ErrorList from "~/components/forms/ErrorList";
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
	console.log("API Set-Cookie header:", apiSetCookie);

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
	console.log("Redirecting to:", finalRedirectTo);

	return redirect(finalRedirectTo, { headers });
}

const Login = ({ actionData }: Route.ComponentProps) => {
	const [searchParams] = useSearchParams();
	const redirectTo = searchParams.get("redirectTo");

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
				<Heading size="8">Log in</Heading>
			</Box>
			<Form method="post" {...getFormProps(form)}>
				<HoneypotInputs />
				<ErrorList errors={form.errors} id={form.errorId} />
				<TextInput
					labelProps={{
						htmlFor: fields.email.name,
						children: "Email address",
					}}
					inputProps={{ ...getInputProps(fields.email, { type: "email" }) }}
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
					<Flex mb="5" align="center" justify="between" gap="3" width="100%">
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

				<input {...getInputProps(fields.redirectTo, { type: "hidden" })} />

				<SubmitButton label="Log in" />

				<Box mt="5">
					<Text size="2">New here? </Text>
					<RLink asChild>
						<Link
							to={
								redirectTo
									? `/accounts/signup?${encodeURIComponent(redirectTo)}`
									: "/accounts/signup"
							}
						>
							<Text size="2">Create an account</Text>.
						</Link>
					</RLink>
				</Box>
			</Form>
		</Layout>
	);
};

export default Login;
