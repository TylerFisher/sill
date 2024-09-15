import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type MetaFunction,
	json,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { createPost } from "~/models/post.server";
import { requireUser } from "~/session.server";

export const meta: MetaFunction = () => [{ title: "Add Post" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const user = await requireUser(request);

	return json({
		user: user,
	});
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = await request.formData();
	const actorId = String(formData.get("actorId"));
	const postBody = String(formData.get("postBody"));
	if (!postBody) return null;
	const post = await createPost(postBody, actorId, request);
	return json({
		post,
	});
};

const AddPost = () => {
	const data = useLoaderData<typeof loader>();
	return (
		<>
			<h1>Add post</h1>
			<Form method="post">
				<input type="hidden" name="actorId" value={data.user.actor?.id} />
				<textarea name="postBody" />
				<input type="submit" value="Post" />
			</Form>
		</>
	);
};

export default AddPost;
