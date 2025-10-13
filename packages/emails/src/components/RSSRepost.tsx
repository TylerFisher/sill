import type { MostRecentLinkPosts } from "@sill/schema";

const RSSRepost = ({ group }: { group: MostRecentLinkPosts["posts"] }) => {
	if (!group) return null;
	const reposters = group.filter((post) => post.repostActorHandle);

	if (!reposters.length) return null;

	return (
		<p>
			<small>
				Reposted by{" "}
				{reposters.map((post, index) => (
					<a key={post.repostActorUrl} href={post.repostActorUrl || ""}>
						{post.repostActorName}
						{index < reposters.length - 1 ? ", " : ""}
					</a>
				))}
			</small>
		</p>
	);
};

export default RSSRepost;
