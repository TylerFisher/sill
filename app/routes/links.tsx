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
			{data.links.map((link) => (
				<li key={link[0]}>
					<a href={link[0]}>{link[1][0].link.title || link[0]}</a> posted by{" "}
					{link[1].length} people
				</li>
			))}
		</ul>
	);
};

export default Links;
