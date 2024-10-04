import { Box } from "@radix-ui/themes";
import LinkRep from "./LinkRep";
import PostRep, { type ExtendedLinkPost } from "./PostRep";
import groupBy from "object.groupby";

interface LinkPostRepProps {
	link: string;
	linkPosts: ExtendedLinkPost[];
}

const LinkPostRep = ({ link, linkPosts }: LinkPostRepProps) => {
	const groupedLinkPosts = groupBy(linkPosts, (l) => l.postUrl);

	return (
		<Box key={link} mb="5" maxWidth="600px">
			<LinkRep
				link={linkPosts[0].link}
				numPosts={[...new Set(linkPosts.map((l) => l.actorHandle))].length}
			/>
			{Object.entries(groupedLinkPosts).map(([postUrl, group]) => (
				<PostRep key={postUrl} post={group[0].post} group={group} />
			))}
		</Box>
	);
};

export default LinkPostRep;
