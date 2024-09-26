import {
	type ActionFunctionArgs,
	type MetaFunction,
	json,
} from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { createUser, getUserByEmail } from "../models/user.server";
import { createUserSession } from "../session.server";
import { validateEmail } from "../utils";
import {
	Container,
	Heading,
	TextField,
	Text,
	Button,
	Box,
	Flex,
} from "@radix-ui/themes";

export const meta: MetaFunction = () => [{ title: "Create account" }];

interface FormErrors {
	email?: string;
	password?: string;
	passwordConfirm?: string;
}

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = await request.formData();
	const email = String(formData.get("email"));
	const sentPassword = String(formData.get("password"));
	const confirmedPassword = String(formData.get("password_confirm"));

	const errors: FormErrors = {};

	if (!validateEmail(email)) {
		errors.email = "Invalid email address";
	}

	if (!sentPassword) {
		errors.password = "Password is required";
	}

	if (sentPassword !== confirmedPassword) {
		errors.passwordConfirm = "Passwords do not match";
	}
	const existingUser = await getUserByEmail(email);

	if (existingUser) {
		errors.email = "An account with this email address already exists";
	}

	if (Object.keys(errors).length > 0) {
		return json({ errors }, { status: 400 });
	}

	const user = await createUser(email, sentPassword);

	return createUserSession({
		redirectTo: "/connect",
		remember: false,
		request,
		userId: user.id,
	});
};

const UserSetup = () => {
	const actionData = useActionData<typeof action>();

	return (
		<Container mt="9">
			<Box mb="5">
				<Heading size="8">Sign up</Heading>
			</Box>

			<Form method="post">
				<Box mb="5">
					<Flex mb="1">
						<label htmlFor="email">
							<Text size="3" weight="bold">
								Email address
							</Text>
						</label>
					</Flex>
					<TextField.Root
						type="email"
						name="email"
						required={true}
						placeholder="tyler@tylerjfisher.com"
						aria-invalid={actionData?.errors.email != null ? true : undefined}
						size="3"
					>
						<TextField.Slot />
					</TextField.Root>
					{actionData?.errors?.email ? (
						<Text size="1">{actionData?.errors.email}</Text>
					) : null}
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
							actionData?.errors.password != null ? true : undefined
						}
						size="3"
					>
						<TextField.Slot />
					</TextField.Root>
					{actionData?.errors.password ? (
						<Text size="1">{actionData?.errors.password}</Text>
					) : null}
				</Box>

				<Box mb="5">
					<Flex mb="1">
						<label htmlFor="password_confirm">
							<Text size="3" weight="bold">
								Confirm password
							</Text>
						</label>
					</Flex>
					<TextField.Root
						type="password"
						name="password_confirm"
						required={true}
						minLength={6}
						aria-invalid={
							actionData?.errors.passwordConfirm != null ? true : undefined
						}
						size="3"
					>
						<TextField.Slot />
					</TextField.Root>
					{actionData?.errors.passwordConfirm ? (
						<Text size="1">{actionData?.errors.passwordConfirm}</Text>
					) : null}
				</Box>

				<Button type="submit" size="3">
					Submit
				</Button>
			</Form>
		</Container>
	);
};

export default UserSetup;
