import { Link, Text } from "@radix-ui/themes";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import type { PostReturn } from "~/utils/links.server";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

interface PostAuthor {
	actor: PostReturn["actor"];
	postUrl?: string;
	postDate?: Date;
}

const PostAuthor = ({ actor, postUrl, postDate }: PostAuthor) => (
	<Text
		size={{
			initial: "2",
			sm: "3",
		}}
		weight="bold"
		as="p"
		style={{
			marginBottom: "2px",
			whiteSpace: "pre-wrap",
		}}
	>
		<Link href={actor.url} target="_blank" rel="noreferrer" underline="hover">
			{actor.name}{" "}
		</Link>
		<Link href={actor.url} target="_blank" rel="noreferrer" underline="none">
			{" "}
			<Text color="gray" weight="regular">
				@{actor.handle}
			</Text>
		</Link>
		{postUrl && postDate && (
			<>
				<Text mx="1" color="gray">
					·
				</Text>
				<Link href={postUrl} target="_blank" rel="noreferrer" underline="hover">
					<Text color="gray" weight="regular">
						{timeAgo.format(postDate, "twitter-now")}
					</Text>
				</Link>
			</>
		)}
	</Text>
);

export default PostAuthor;
