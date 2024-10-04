import {
	type LoaderFunctionArgs,
	type MetaFunction,
	json,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Container, Box } from "@radix-ui/themes";
import { countLinkOccurrences } from "~/models/links.server";
import { requireUserId } from "~/session.server";
import LinkRep from "~/components/LinkRep";
import PostRep from "~/components/PostRep";

export const meta: MetaFunction = () => [{ title: "Links" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);
	const links = await countLinkOccurrences(userId);

	return json({ links });
};

const Links = () => {
	const data = useLoaderData<typeof loader>();

	return (
		<Container mt="9">
			{data.links.map((link) => (
				<Box key={link[1][0].link.id} mb="5" maxWidth="600px">
					<LinkRep
						link={link[1][0].link}
						numPosts={[...new Set(link[1].map((l) => l.actorHandle))].length}
					/>
					{link[1].map((linkPost) => (
						<PostRep
							key={linkPost.post.id}
							post={linkPost.post}
							linkPostActor={linkPost.actor}
						/>
					))}
				</Box>
			))}
		</Container>
	);
};

export default Links;
