import { Link, Text } from "@radix-ui/themes";
import type { Actor } from "@prisma/client";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

interface PostAuthor {
	actor: Actor;
	postUrl?: string;
	postDate?: Date;
}

const PostAuthor = ({ actor, postUrl, postDate }: PostAuthor) => (
	<Text size="3" weight="bold" as="p">
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
