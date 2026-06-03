import type { MostRecentLinkPosts } from "@sill/schema";
import { postViewLabel } from "../utils/postSource.js";
import RSSRepost from "./RSSRepost.js";

const RSSPost = ({
	postUrl,
	group,
}: { postUrl: string; group: MostRecentLinkPosts["posts"] }) => {
	if (!group) return null;
	const post = group[0];
	const viewLabel = postViewLabel(post.postType, post.collection, post.postUrl);
	// Quoted posts are always a Bluesky/Mastodon post (no atbookmark collection),
	// so the noun comes from quotedPostType.
	const quotedViewLabel = post.quotedPostType
		? postViewLabel(post.quotedPostType, null, post.quotedPostUrl)
		: null;
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
						<p dangerouslySetInnerHTML={{ __html: post.quotedPostText }} />
						{post.quotedPostImages && (
							<div>
								{post.quotedPostImages.map((image) => (
									<img src={image.url} alt={image.alt} key={image.url} />
								))}
							</div>
						)}
						{quotedViewLabel && post.quotedPostUrl && (
							<p>
								<a href={post.quotedPostUrl}>
									<small>{quotedViewLabel}</small>
								</a>
							</p>
						)}
					</blockquote>
				)}
				{viewLabel && (
					<p>
						<a href={post.postUrl}>
							<small>{viewLabel}</small>
						</a>
					</p>
				)}
			</blockquote>
		</div>
	);
};

export default RSSPost;
