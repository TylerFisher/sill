import { Heading, Link } from "@radix-ui/themes";
import type { MostRecentLinkPosts } from "~/utils/links.server";

const RSSRepost = ({ group }: { group: MostRecentLinkPosts["posts"] }) => {
	if (!group) return null;
	const reposters = group.filter((post) => post.repostActorHandle);

	if (!reposters.length) return null;

	return (
		<Heading as="h5">
			Reposted by{" "}
			{reposters.map((post, index) => (
				<Link key={post.repostActorUrl} href={post.repostActorUrl || ""}>
					{post.repostActorName}
					{index < reposters.length - 1 ? ", " : ""}
				</Link>
			))}
		</Heading>
	);
};

export default RSSRepost;
