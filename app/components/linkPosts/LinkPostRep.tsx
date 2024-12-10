import * as Collapsible from "@radix-ui/react-collapsible";
import { Avatar, Box, Button, Heading, Text } from "@radix-ui/themes";
import { ChevronDown, ChevronUp } from "lucide-react";
import groupBy from "object.groupby";
import { useState } from "react";
import LinkRep from "~/components/linkPosts/LinkRep";
import PostRep from "~/components/linkPosts/PostRep";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import SharedByBug from "./SharedByBug";

export interface LinkPostRepProps {
	linkPost: MostRecentLinkPosts;
	instance: string | undefined;
	bsky: string | undefined;
	layout: "dense" | "default";
	autoExpand?: boolean;
}

const LinkPostRep = ({
	linkPost,
	instance,
	bsky,
	layout,
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
			<LinkRep
				link={linkPost.link}
				instance={instance}
				bsky={bsky}
				layout={layout}
			/>
			<Collapsible.Root
				className="CollapsibleRoot"
				open={open}
				onOpenChange={setOpen}
			>
				<SharedByBug
					uniqueActors={uniqueActors}
					uniqueActorsCount={linkPost.uniqueActorsCount}
					open={open}
				/>
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
