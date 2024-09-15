import {
	type ActionFunctionArgs,
	type MetaFunction,
	json,
} from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { createUser, getUserByEmail } from "../models/user.server";
import { createUserSession } from "../session.server";
import { validateEmail } from "../utils";

export const meta: MetaFunction = () => [{ title: "Create account" }];

interface FormErrors {
	email?: String;
	password?: String;
	passwordConfirm?: String;
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
		redirectTo: "/actors/setup",
		remember: false,
		request,
		userId: user.id,
	});
};

const UserSetup = () => {
	const actionData = useActionData<typeof action>();

	return (
		<>
			<h1>Welcome!</h1>
			<p>Setup your account.</p>
			<Form method="post">
				<fieldset>
					<label>
						Email{" "}
						<input
							type="email"
							name="email"
							required={true}
							placeholder="john@example.com"
							aria-invalid={actionData?.errors.email != null ? true : undefined}
						/>
						{actionData?.errors?.email ? (
							<small>{actionData?.errors.email}</small>
						) : null}
					</label>
				</fieldset>
				<fieldset className="grid">
					<label>
						Password{" "}
						<input
							type="password"
							name="password"
							required={true}
							minLength={6}
							aria-invalid={
								actionData?.errors.password != null ? true : undefined
							}
						/>
						{actionData?.errors.password ? (
							<small>{actionData?.errors.password}</small>
						) : null}
					</label>
					<label>
						Password (again){" "}
						<input
							type="password"
							name="password_confirm"
							required={true}
							minLength={6}
							aria-invalid={
								actionData?.errors.passwordConfirm != null ? true : undefined
							}
						/>
						{actionData?.errors.passwordConfirm ? (
							<small>{actionData?.errors.passwordConfirm}</small>
						) : null}
					</label>
				</fieldset>
				<button type="submit">Submit</button>
			</Form>
		</>
	);
};

export default UserSetup;
