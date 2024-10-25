import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Box, Button, Flex, Text, Heading } from "@radix-ui/themes";
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type MetaFunction,
} from "@vercel/remix";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { z } from "zod";
import TextInput from "~/components/forms/TextInput";
import CheckboxField from "~/components/forms/CheckboxField";
import { login, requireAnonymous } from "~/utils/auth.server";
import { checkHoneypot } from "~/utils/honeypot.server";
import { PasswordSchema, UsernameSchema } from "~/utils/userValidation";
import { handleNewSession } from "./accounts.login.server";

import Layout from "~/components/nav/Layout";
import ErrorList from "~/components/forms/ErrorList";

export const meta: MetaFunction = () => [{ title: "Login" }];

const LoginFormSchema = z.object({
	username: UsernameSchema,
	password: PasswordSchema,
	redirectTo: z.string().optional(),
	remember: z.boolean().optional(),
});

export async function loader({ request }: LoaderFunctionArgs) {
	await requireAnonymous(request);
	return json({});
}

export async function action({ request }: ActionFunctionArgs) {
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
						message: "Invalid username or password",
					});
					return z.NEVER;
				}

				return { ...data, session };
			}),
		async: true,
	});

	if (submission.status !== "success" || !submission.value.session) {
		return json(
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
	});
}

const Login = () => {
	const actionData = useActionData<typeof action>();
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
		<Layout>
			<Box mb="5">
				<Heading size="8">Login</Heading>
			</Box>
			<Form method="post" {...getFormProps(form)}>
				<HoneypotInputs />
				<ErrorList errors={form.errors} id={form.errorId} />
				<TextInput
					labelProps={{
						htmlFor: fields.username.name,
						children: "Username",
					}}
					inputProps={{ ...getInputProps(fields.username, { type: "text" }) }}
					errors={fields.username.errors}
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
								htmlFor: fields.remember.name,
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

				<Button type="submit">Sign in</Button>

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
