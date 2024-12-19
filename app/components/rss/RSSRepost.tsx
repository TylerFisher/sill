import { Heading } from "@radix-ui/themes";
import type { MostRecentLinkPosts } from "~/utils/links.server";

const RSSRepost = ({ group }: { group: MostRecentLinkPosts["posts"] }) => {
	if (!group) return null;
	const reposters = group.filter((post) => post.repostActorHandle);

	if (!reposters.length) return null;

	return (
		<Heading as="h6">
			Reposted by {reposters.map((post) => post.repostActorName).join(", ")}
		</Heading>
	);
};

export default RSSRepost;
