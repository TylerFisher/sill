import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type MetaFunction,
	json,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { createFeed } from "~/models/feed.server";
import { requireUser } from "~/session.server";

export const meta: MetaFunction = () => [{ title: "Add Feed" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const user = await requireUser(request);

	return json({
		user: user,
	});
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = await request.formData();
	const url = String(formData.get("url"));
	const userId = String(formData.get("userId"));
	const feedData = await createFeed(url, userId);
	return json({
		feedData,
	});
};

const AddFeed = () => {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	return (
		<>
			<h1>Add feed</h1>
			{actionData?.feedData?.statuses &&
				actionData?.feedData?.statuses.length > 0 && (
					<p>Created {actionData?.feedData?.statuses.length} items</p>
				)}
			<Form method="post">
				<input type="hidden" value={data.user.id} name="userId" />
				{/* biome-ignore lint/a11y/useSemanticElements: picocss wants this */}
				<fieldset role="group">
					<input type="url" name="url" placeholder="Enter RSS URL" />
					<input type="submit" value="Add" />
				</fieldset>
			</Form>
		</>
	);
};

export default AddFeed;
