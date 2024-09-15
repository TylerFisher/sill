import {
	json,
	LoaderFunctionArgs,
	type ActionFunctionArgs,
	type MetaFunction,
	redirect,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { requireUser } from "../session.server";
import { createActor, ActorFormData } from "../models/actor.server";

interface FormErrors {
	username?: String;
	name?: String;
}

export const meta: MetaFunction = () => [{ title: "Create actor" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const user = await requireUser(request);

	return json({
		user: user,
	});
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = await request.formData();
	const userId = String(formData.get("userId"));
	const username = String(formData.get("username"));
	const name = String(formData.get("name"));
	const bio = String(formData.get("bio"));
	const protected_ = Boolean(formData.get("protected"));
	const language = String(formData.get("language"));
	const visibility = String(formData.get("visibility"));

	const errors: FormErrors = {};
	if (!username) {
		errors.username = "Username is required";
	}
	if (!name) {
		errors.name = "Display name is required";
	}

	if (Object.keys(errors).length > 0) {
		return json({ errors }, { status: 400 });
	}

	const actorFormData: ActorFormData = {
		username,
		name,
		bio,
		protected: protected_,
		language,
		visibility,
		userId,
	};

	await createActor(request, actorFormData);
	return redirect("/");
};

const Setup = () => {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	return (
		<Form method="post">
			<fieldset>
				<input type="hidden" name="userId" value={data.user.id} />
				<label>
					Username
					<input
						type="text"
						name="username"
						required={true}
						placeholder="john"
						aria-invalid={
							actionData?.errors?.username != null ? true : undefined
						}
						pattern="^[\\p{L}\\p{N}._\\-]+$"
					/>
					<small>
						{actionData?.errors?.username == null
							? "Your username will a part of your fediverse handle."
							: actionData?.errors?.username}
					</small>
				</label>
				<label>
					Display name{" "}
					<input
						type="text"
						name="name"
						required={true}
						placeholder="John Doe"
						aria-invalid={actionData?.errors?.name != null ? true : undefined}
					/>
					<small>
						{actionData?.errors?.name == null
							? "Your display name will be shown on your profile."
							: actionData?.errors?.name}
					</small>
				</label>
				<label>
					Bio{" "}
					<textarea
						name="bio"
						placeholder="A software engineer in Seoul, and a father of two kids."
					></textarea>
					<small>A short description of yourself. Markdown is supported.</small>
				</label>
				<label>
					<input type="checkbox" name="protected" value="true" /> Protect your
					account &mdash; only approved followers can see your posts
				</label>
			</fieldset>
			<label>
				Default visibility{" "}
				<select name="visibility">
					<option value="public">Public</option>
					<option value="unlisted">Unlisted</option>
					<option value="private">Followers only</option>
					<option value="direct">Direct message</option>
				</select>
			</label>
			<button type="submit">Create</button>
		</Form>
	);
};

export default Setup;
