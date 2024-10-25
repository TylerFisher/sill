import {
	Section,
	Heading,
	Text,
	Img,
	Column,
	Row,
	Link,
} from "@react-email/components";
import type { MostRecentLinkPosts } from "~/utils/links.server";
import groupBy from "object.groupby";

interface LinkPostProps {
	linkPosts: MostRecentLinkPosts[];
}

const LinkPost = ({ linkPosts }: LinkPostProps) => {
	const link = linkPosts[0].link;
	const allActors = linkPosts.map((l) =>
		l.post.reposter ? l.post.reposter.avatarUrl : l.post.actor.avatarUrl,
	);
	const uniqueActors = [...new Set(allActors)].filter((a) => a !== null);

	return (
		<>
			<Link href={link.url}>
				<Section style={wrapper}>
					{link.imageUrl && (
						<Row>
							<Column>
								<Img src={link.imageUrl} style={img} />
							</Column>
						</Row>
					)}
					<Row style={row}>
						<Column>
							<Text style={host}>{new URL(link.url).host}</Text>
							<Heading style={heading} as="h2">
								{link.title || link.url}
							</Heading>
							<Text style={text}>{link.description}</Text>
						</Column>
					</Row>
				</Section>
			</Link>
			{uniqueActors.slice(0, 3).map((actor, i) => (
				<Img
					src={actor}
					loading="lazy"
					decoding="async"
					key={actor}
					style={avatar(i)}
				/>
			))}
			<Text style={accounts}>
				Posted by {uniqueActors.length}{" "}
				{uniqueActors.length === 1 ? "account" : "accounts"} you follow
			</Text>
		</>
	);
};

const wrapper = {
	maxWidth: "100%",
	margin: "0 0 20px 0",
	borderRadius: "12px",
	border: "gray 1px solid",
};

const row = {
	padding: "12px",
};

const img = {
	width: "100%",
	height: "auto",
	borderTopLeftRadius: "12px",
	borderTopRightRadius: "12px",
	aspectRatio: "16 / 9",
};

const host = {
	margin: 0,
	color: "gray",
	fontSize: "12px",
	lineHeight: 1,
};
const heading = {
	color: "black",
	lineHeight: 1.2,
};

const text = {
	color: "black",
};

const avatar = (i: number) => ({
	margin: i > 0 ? "0 0 0 -12px" : 0,
	borderRadius: "100%",
	display: "inline-block",
	width: "24px",
	height: "24px",
});

const accounts = {
	display: "inline",
	color: "black",
	verticalAlign: "top",
	margin: "0 0 0 12px",
};

export default LinkPost;
