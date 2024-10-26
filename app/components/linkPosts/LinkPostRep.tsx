import { useState } from "react";
import type { SerializeFrom } from "@vercel/remix";
import { Avatar, Box, Button } from "@radix-ui/themes";
import groupBy from "object.groupby";
import * as Collapsible from "@radix-ui/react-collapsible";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import LinkRep from "~/components/linkPosts/LinkRep";
import PostRep from "~/components/linkPosts/PostRep";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface LinkPostRepProps {
	link: string;
	linkPosts: SerializeFrom<MostRecentLinkPosts>[];
}

const LinkPostRep = ({ link, linkPosts }: LinkPostRepProps) => {
	const [open, setOpen] = useState(false);
	const groupedLinkPosts = groupBy(linkPosts, (l) => l.post.url);
	const allActors = linkPosts.map((l) =>
		l.post.reposter ? l.post.reposter.avatarUrl : l.post.actor.avatarUrl,
	);
	const uniqueActors = [...new Set(allActors)];

	return (
		<Box key={link}>
			<LinkRep link={linkPosts[0].link} />
			<Collapsible.Root
				className="CollapsibleRoot"
				open={open}
				onOpenChange={setOpen}
			>
				<Collapsible.Trigger asChild>
					<Button
						variant="soft"
						size={{
							initial: "1",
							md: "2",
						}}
					>
						{uniqueActors.slice(0, 3).map((actor, i) => (
							<Avatar
								src={actor || undefined}
								alt=""
								loading="lazy"
								decoding="async"
								fallback="T"
								key={actor}
								radius="full"
								size="1"
								style={{
									marginLeft: i > 0 ? "-12px" : "0",
								}}
							/>
						))}
						Posted by {uniqueActors.length}{" "}
						{uniqueActors.length === 1 ? "account" : "accounts"} you follow
						{open ? (
							<ChevronUp width="14" height="14" />
						) : (
							<ChevronDown width="14" height="14" />
						)}
					</Button>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<Box mt="5">
						{Object.entries(groupedLinkPosts).map(([postUrl, group]) => (
							<PostRep key={postUrl} post={group[0].post} group={group} />
						))}
					</Box>
				</Collapsible.Content>
			</Collapsible.Root>
		</Box>
	);
};

export default LinkPostRep;
