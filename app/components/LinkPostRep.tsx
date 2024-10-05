import { useState } from "react";
import { Avatar, Box, Button, IconButton, Text } from "@radix-ui/themes";
import LinkRep from "./LinkRep";
import PostRep, { type ExtendedLinkPost } from "./PostRep";
import groupBy from "object.groupby";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";

interface LinkPostRepProps {
	link: string;
	linkPosts: ExtendedLinkPost[];
}

const LinkPostRep = ({ link, linkPosts }: LinkPostRepProps) => {
	const [open, setOpen] = useState(false);
	const groupedLinkPosts = groupBy(linkPosts, (l) => l.postUrl);
	const uniqueActors = [...new Set(linkPosts.map((l) => l.actor.avatarUrl))];

	return (
		<Box key={link} mb="5" maxWidth="600px">
			<LinkRep link={linkPosts[0].link} />
			<Collapsible.Root
				className="CollapsibleRoot"
				open={open}
				onOpenChange={setOpen}
			>
				<Collapsible.Trigger asChild>
					<Button variant="outline">
						{uniqueActors.slice(0, 3).map((actor, i) => (
							<Avatar
								src={actor || undefined}
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
						{open ? <ChevronUpIcon /> : <ChevronDownIcon />}
					</Button>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<Box mt="2">
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
