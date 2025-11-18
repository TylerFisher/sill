import { Heading, Link, Text } from "@radix-ui/themes";
import type { MostRecentLinkPosts } from "@sill/schema";

const RSSLinkPost = ({
	linkPost,
	digestUrl,
}: { linkPost: MostRecentLinkPosts; digestUrl: string }) => {
	if (!linkPost.link || !linkPost.posts) return null;

	const allActors = linkPost.posts.map((l) =>
		l.repostActorHandle ? l.repostActorName : l.actorName,
	);
	const uniqueActors = [...new Set(allActors)].filter((a) => a !== null);
	const host = new URL(linkPost.link.url).host;

	return (
		<div key={linkPost.link.url}>
			<Heading as="h5">
				<Link href={linkPost.link.url}>
					<small>{host}</small>
				</Link>
				{linkPost.link.giftUrl && (
					<>
						{" "}
						<Link href={linkPost.link.giftUrl}>
							<small>(gift link)</small>
						</Link>
					</>
				)}
			</Heading>
			<Heading as="h3">
				<Link href={linkPost.link.url}>
					{linkPost.link.title || linkPost.link.url}
				</Link>
			</Heading>
			<Text as="p">{linkPost.link.description}</Text>
			<Text as="p">
				<Link href={`${digestUrl}#${linkPost.link.id}`}>
					Shared by {linkPost.uniqueActorsCount} account
					{linkPost.uniqueActorsCount > 1 && "s"}
					{uniqueActors.length === 1
						? `: ${uniqueActors[0]}`
						: uniqueActors.length === 2
							? `: ${uniqueActors[0]} and ${uniqueActors[1]}`
							: `, including ${uniqueActors.slice(0, 2).join(", ")} and ${
									uniqueActors[2]
								}`}
					.
				</Link>
			</Text>
			<hr />
		</div>
	);
};

export default RSSLinkPost;
