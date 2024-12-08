import * as Collapsible from "@radix-ui/react-collapsible";
import { Avatar, Box, Button } from "@radix-ui/themes";
import { ChevronDown, ChevronUp } from "lucide-react";
import groupBy from "object.groupby";
import { useState } from "react";
import LinkRep from "~/components/linkPosts/LinkRep";
import PostRep from "~/components/linkPosts/PostRep";
import type { MostRecentLinkPosts } from "~/utils/links.server";

export interface LinkPostRepProps {
	linkPost: MostRecentLinkPosts;
	instance: string | undefined;
	bsky: string | undefined;
	autoExpand?: boolean;
}

const LinkPostRep = ({
	linkPost,
	instance,
	bsky,
	autoExpand = false,
}: LinkPostRepProps) => {
	if (!linkPost) return null;
	if (!linkPost.posts || !linkPost.link) return null;
	const [open, setOpen] = useState(autoExpand);
	const groupedPosts = groupBy(linkPost.posts, (l) => l.postUrl);
	const allActors = linkPost.posts.map((p) =>
		p.repostActorHandle ? p.repostActorAvatarUrl : p.actorAvatarUrl,
	);
	const uniqueActors = [...new Set(allActors)];

	return (
		<Box key={linkPost.link.url}>
			<LinkRep link={linkPost.link} instance={instance} bsky={bsky} />
			<Collapsible.Root
				className="CollapsibleRoot"
				open={open}
				onOpenChange={setOpen}
			>
				<Collapsible.Trigger asChild>
					<Button variant="soft" size="2">
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
						Shared by {linkPost.uniqueActorsCount}{" "}
						{linkPost.uniqueActorsCount === 1 ? "account" : "accounts"}
						{open ? (
							<ChevronUp width="14" height="14" />
						) : (
							<ChevronDown width="14" height="14" />
						)}
					</Button>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<Box mt="5">
						{Object.entries(groupedPosts).map(([postUrl, group]) => (
							<PostRep
								key={postUrl}
								group={group}
								instance={instance}
								bsky={bsky}
							/>
						))}
					</Box>
				</Collapsible.Content>
			</Collapsible.Root>
		</Box>
	);
};

export default LinkPostRep;
