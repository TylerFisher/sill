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
					<ul>
						{link[1].map((linkPost) => (
							<li key={linkPost.id}>
								{linkPost.actor.handle !== linkPost.post.actor.handle && (
									<>
										<em>Reposted by {linkPost.actor.handle}</em>
										<br />
									</>
								)}
								{linkPost.post.text} -{" "}
								<a href={linkPost.post.url}>
									{linkPost.post.actor.name} ({linkPost.post.actor.handle})
								</a>{" "}
								{linkPost.post.quoting && (
									<ul>
										<li>
											{linkPost.post.quoting.text} -{" "}
											<a href={linkPost.post.quoting.url}>
												{linkPost.post.quoting.actor.name} (
												{linkPost.post.quoting.actorHandle})
											</a>
										</li>
									</ul>
								)}
							</li>
						))}
					</ul>
				</li>
			))}
		</ul>
	);
};

export default Links;
