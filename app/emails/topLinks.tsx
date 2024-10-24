import { Container, Heading, Html } from "@react-email/components";
import type { ExtendedLinkPost } from "~/components/linkPosts/PostRep";
import LinkPostRep from "~/components/linkPosts/LinkPostRep";
import { Separator } from "@radix-ui/themes";

interface TopLinksProps {
	links: [string, ExtendedLinkPost[]][];
}

const TopLinks = ({ links }: TopLinksProps) => {
	return (
		<Html>
			<Container>
				<Heading>Your top links</Heading>
				{links.map((link, i) => (
					<div key={link[0]}>
						<LinkPostRep link={link[0]} linkPosts={link[1]} />
						{i < links.length - 1 && (
							<Separator my="7" size="4" orientation="horizontal" />
						)}
					</div>
				))}
			</Container>
		</Html>
	);
};

export default TopLinks;
