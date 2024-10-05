import {
	type ActionFunctionArgs,
	type MetaFunction,
	json,
} from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { Box, TextField, Heading, Button, Flex, Text } from "@radix-ui/themes";
import { verifyLogin } from "../models/user.server";
import { createUserSession } from "../session.server";
import { validateEmail } from "../utils";

import Layout from "~/components/Layout";

export const meta: MetaFunction = () => [{ title: "Login" }];

interface FormErrors {
	email?: string;
	password?: string;
	passwordConfirm?: string;
}

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = await request.formData();
	const email = String(formData.get("email"));
	const sentPassword = String(formData.get("password"));

	const errors: FormErrors = {};

	if (!validateEmail(email)) {
		errors.email = "Invalid email address";
	}

	if (!sentPassword) {
		errors.password = "Password is required";
	}

	if (Object.keys(errors).length > 0) {
		return json({ errors }, { status: 400 });
	}

	const user = await verifyLogin(email, sentPassword);

	if (!user) {
		errors.email = "Invalid email or password";
		errors.password = "Invalid email or password";
		return json({ errors }, { status: 400 });
	}

	return createUserSession({
		redirectTo: "/connect",
		remember: false,
		request,
		userId: user.id,
	});
};

const Index = () => {
	const actionData = useActionData<typeof action>();

	return (
		<Layout>
			<Box mb="5">
				<Heading size="8">Login</Heading>
			</Box>
			<Form method="post">
				<Box mb="5">
					<Flex mb="1">
						<label htmlFor="email">
							<Text size="3" weight="bold">
								Email
							</Text>
						</label>
					</Flex>
					<TextField.Root
						type="email"
						name="email"
						required={true}
						placeholder="john@example.com"
						aria-invalid={actionData?.errors?.email != null ? true : undefined}
					>
						<TextField.Slot />
					</TextField.Root>
					{actionData?.errors?.email && (
						<small>{actionData?.errors.email}</small>
					)}
				</Box>
				<Box mb="5">
					<Flex mb="1">
						<label htmlFor="password">
							<Text size="3" weight="bold">
								Password
							</Text>
						</label>
					</Flex>
					<TextField.Root
						type="password"
						name="password"
						required={true}
						minLength={6}
						aria-invalid={
							actionData?.errors?.password != null ? true : undefined
						}
					>
						<TextField.Slot />
					</TextField.Root>
					{actionData?.errors?.password && (
						<small>{actionData?.errors.password}</small>
					)}
				</Box>

				<Button type="submit">Sign in</Button>
			</Form>
		</Layout>
	);
};

export default Index;
