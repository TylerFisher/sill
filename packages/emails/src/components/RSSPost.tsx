import RSSRepost from "./RSSRepost";
import type { MostRecentLinkPosts } from "@sill/schema";

const RSSPost = ({
	postUrl,
	group,
}: { postUrl: string; group: MostRecentLinkPosts["posts"] }) => {
	if (!group) return null;
	const post = group[0];
	return (
		<div key={postUrl}>
			<blockquote>
				<RSSRepost group={group} />
				<h4>
					<a href={post.actorUrl}>
						{post.actorName} (@{post.actorHandle})
					</a>
				</h4>
				<p
					dangerouslySetInnerHTML={{
						__html: post.postText,
					}}
				/>
				{post.postImages && (
					<div>
						{post.postImages.map((image) => (
							<img src={image.url} alt={image.alt} key={image.url} />
						))}
					</div>
				)}
				{post.quotedPostText && (
					<blockquote>
						<h5>
							<a href={post.quotedActorUrl || ""}>
								{post.quotedActorName} (@{post.quotedActorHandle})
							</a>
						</h5>
						<p
							dangerouslySetInnerHTML={{ __html: post.quotedPostText }}
						/>
						{post.quotedPostImages && (
							<div>
								{post.quotedPostImages.map((image) => (
									<img src={image.url} alt={image.alt} key={image.url} />
								))}
							</div>
						)}
						{post.quotedPostType && post.quotedPostUrl && (
							<p>
								<a href={post.quotedPostUrl}>
									<small>
										View post on{" "}
										{post.quotedPostType.charAt(0).toUpperCase() +
											post.quotedPostType.slice(1)}{" "}
										→
									</small>
								</a>
							</p>
						)}
					</blockquote>
				)}
				<p>
					<a href={post.postUrl}>
						<small>
							View post on{" "}
							{post.postType.charAt(0).toUpperCase() + post.postType.slice(1)} →
						</small>
					</a>
				</p>
			</blockquote>
		</div>
	);
};

export default RSSPost;
