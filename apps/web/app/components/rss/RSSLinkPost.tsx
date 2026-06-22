import { Heading, Link, Text } from "@radix-ui/themes";
import type { MostRecentLinkPosts } from "@sill/schema";
import { isReviewCard } from "~/utils/popfeed";
import RSSPopfeedHeader from "./RSSPopfeedHeader";

const sharedByText = (
	count: number,
	uniqueActors: (string | null)[],
): string => {
	const names =
		uniqueActors.length === 1
			? `: ${uniqueActors[0]}`
			: uniqueActors.length === 2
				? `: ${uniqueActors[0]} and ${uniqueActors[1]}`
				: uniqueActors.length > 2
					? `, including ${uniqueActors.slice(0, 2).join(", ")} and ${uniqueActors[2]}`
					: "";
	return `Shared by ${count} account${count > 1 ? "s" : ""}${names}.`;
};

const RSSLinkPost = ({
	linkPost,
	digestUrl,
}: { linkPost: MostRecentLinkPosts; digestUrl: string }) => {
	if (!linkPost.link || !linkPost.posts) return null;

	const link = linkPost.link;
	const allActors = linkPost.posts.map((l) =>
		l.repostActorHandle ? l.repostActorName : l.actorName,
	);
	const uniqueActors = [...new Set(allActors)].filter((a) => a !== null);
	const host = new URL(link.url).host;

	// Popfeed review: vertical poster beside "{credit} / {title} / {type} • {year}".
	if (isReviewCard(link)) {
		return (
			<div key={link.url}>
				<RSSPopfeedHeader link={link} />
				<Text as="p">
					<Link href={`${digestUrl}#${link.id}`}>
						{sharedByText(linkPost.uniqueActorsCount, uniqueActors)}
					</Link>
				</Text>
				<hr />
			</div>
		);
	}

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
