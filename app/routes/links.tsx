import {
	type LoaderFunctionArgs,
	type MetaFunction,
	json,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { countLinkOccurrences } from "~/models/links.server";
import { requireUserId } from "~/session.server";

export const meta: MetaFunction = () => [{ title: "Links" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);
	const links = await countLinkOccurrences(userId);

	return json({ links });
};

const Links = () => {
	const data = useLoaderData<typeof loader>();

	return (
		<ul>
			{data.links.map((item) => (
				<li>
					<a href={item.linkUrl}>{item.linkUrl}</a> posted by{" "}
					{item._count.linkUrl} people
				</li>
			))}
		</ul>
	);
};

export default Links;
