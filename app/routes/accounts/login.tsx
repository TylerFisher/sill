import type { Route } from "./+types/login";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { data, Form, Link, useSearchParams } from "react-router";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { z } from "zod";
import CheckboxField from "~/components/forms/CheckboxField";
import TextInput from "~/components/forms/TextInput";
import { login, requireAnonymous } from "~/utils/auth.server";
import { checkHoneypot } from "~/utils/honeypot.server";
import { handleNewSession } from "~/utils/login.server";
import { EmailSchema, PasswordSchema } from "~/utils/userValidation";

import ErrorList from "~/components/forms/ErrorList";
import Layout from "~/components/nav/Layout";
import SubmitButton from "~/components/forms/SubmitButton";

export const meta: Route.MetaFunction = () => [{ title: "Sill | Login" }];

const LoginFormSchema = z.object({
	email: EmailSchema,
	password: PasswordSchema,
	redirectTo: z.string().optional(),
	remember: z.boolean().optional(),
});

export async function loader({ request }: Route.LoaderArgs) {
	await requireAnonymous(request);
	return {};
}

export async function action({ request }: Route.ActionArgs) {
	await requireAnonymous(request);
	const formData = await request.formData();
	checkHoneypot(formData);
	const submission = await parseWithZod(formData, {
		schema: (intent) =>
			LoginFormSchema.transform(async (data, ctx) => {
				if (intent !== null) return { ...data, session: null };

				const session = await login(data);
				if (!session) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: "Invalid email or password",
					});
					return z.NEVER;
				}

				return { ...data, session };
			}),
		async: true,
	});

	if (submission.status !== "success" || !submission.value.session) {
		return data(
			{ result: submission.reply({ hideFields: ["password"] }) },
			{ status: submission.status === "error" ? 400 : 200 },
		);
	}

	const { session, remember, redirectTo } = submission.value;

	return handleNewSession({
		request,
		session,
		remember: remember ?? false,
		redirectTo,
	}) as never;
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
				<Heading size="8">Login</Heading>
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
							<Link to="/accounts/forgot-password">
								<Text size="2">Forgot password?</Text>
							</Link>
						</Box>
					</Flex>
				</Box>

				<input {...getInputProps(fields.redirectTo, { type: "hidden" })} />

				<SubmitButton label="Log in" />

				<Box mt="5">
					<Text size="2">New here? </Text>
					<Link
						to={
							redirectTo
								? `/accounts/signup?${encodeURIComponent(redirectTo)}`
								: "/accounts/signup"
						}
					>
						<Text size="2">Create an account</Text>
					</Link>
				</Box>
			</Form>
		</Layout>
	);
};

export default Login;
