import { Link, Text } from "@radix-ui/themes";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import type { linkPostDenormalized } from "@sill/schema";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

interface PostAuthor {
	actorUrl: (typeof linkPostDenormalized.$inferSelect)["actorUrl"];
	actorName: (typeof linkPostDenormalized.$inferSelect)["actorName"];
	actorHandle: (typeof linkPostDenormalized.$inferSelect)["actorHandle"];
	actorAvatarUrl: (typeof linkPostDenormalized.$inferSelect)["actorAvatarUrl"];
}

interface PostAuthorProps {
	actor: PostAuthor;
	postDate?: (typeof linkPostDenormalized.$inferSelect)["postDate"];
	postUrl: (typeof linkPostDenormalized.$inferSelect)["postUrl"];
	layout: "default" | "dense";
}

const PostAuthor = ({ actor, postDate, postUrl, layout }: PostAuthorProps) => (
	<Text
		size={{
			initial: layout === "dense" ? "1" : "2",
			sm: layout === "dense" ? "2" : "3",
		}}
		weight="bold"
		as="p"
		style={{
			marginBottom: "2px",
			whiteSpace: "pre-wrap",
		}}
	>
		<Link
			href={actor.actorUrl}
			target="_blank"
			rel="noreferrer"
			underline="hover"
		>
			{actor.actorName}{" "}
		</Link>
		<Link
			href={actor.actorUrl}
			target="_blank"
			rel="noreferrer"
			underline="none"
		>
			{" "}
			<Text color="gray" weight="regular">
				@{actor.actorHandle}
			</Text>
		</Link>
		{postUrl && postDate && (
			<>
				<Text mx="1" color="gray">
					·
				</Text>
				<Link href={postUrl} target="_blank" rel="noreferrer" underline="hover">
					<Text color="gray" weight="regular">
						{timeAgo.format(new Date(postDate), "twitter-now")}
					</Text>
				</Link>
			</>
		)}
	</Text>
);

export default PostAuthor;
