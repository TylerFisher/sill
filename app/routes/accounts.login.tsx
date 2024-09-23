import {
	type ActionFunctionArgs,
	type MetaFunction,
	json,
} from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { verifyLogin } from "../models/user.server";
import { createUserSession } from "../session.server";
import { validateEmail } from "../utils";

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
		<>
			<h1>Login</h1>
			<Form method="post">
				<label>
					Email{" "}
					<input
						type="email"
						name="email"
						required={true}
						placeholder="john@example.com"
						aria-invalid={actionData?.errors?.email != null ? true : undefined}
					/>
					{actionData?.errors?.email && (
						<small>{actionData?.errors.email}</small>
					)}
				</label>
				<label>
					Password{" "}
					<input
						type="password"
						name="password"
						required={true}
						minLength={6}
						aria-invalid={
							actionData?.errors?.password != null ? true : undefined
						}
					/>
					{actionData?.errors?.password && (
						<small>{actionData?.errors.password}</small>
					)}
				</label>
				<button type="submit">Sign in</button>
			</Form>
		</>
	);
};

export default Index;
