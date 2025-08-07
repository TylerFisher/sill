import { Heading, Link, Text } from "@radix-ui/themes";
import type { MostRecentLinkPosts } from "~/utils/links.server";

const RSSRepost = ({ group }: { group: MostRecentLinkPosts["posts"] }) => {
	if (!group) return null;
	const reposters = group.filter((post) => post.repostActorHandle);

	if (!reposters.length) return null;

	return (
		<Text as="p">
			<small>
				Reposted by{" "}
				{reposters.map((post, index) => (
					<Link key={post.repostActorUrl} href={post.repostActorUrl || ""}>
						{post.repostActorName}
						{index < reposters.length - 1 ? ", " : ""}
					</Link>
				))}
			</small>
		</Text>
	);
};

export default RSSRepost;
