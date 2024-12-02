import {
	Column,
	Heading,
	Img,
	Link,
	Row,
	Section,
	Text,
} from "@react-email/components";
import type { MostRecentLinkPosts } from "~/utils/links.server";

interface LinkPostProps {
	linkPost: MostRecentLinkPosts;
}

const LinkPost = ({ linkPost }: LinkPostProps) => {
	const isProduction = process.env.NODE_ENV === "production";
	const baseUrl = isProduction
		? process.env.PUBLIC_URL
		: "http://localhost:3000";

	if (!linkPost.link || !linkPost.posts) return null;
	const link = linkPost.link;
	const allActors = linkPost.posts.map((l) =>
		l.repostActorHandle ? l.repostActorAvatarUrl : l.actorAvatarUrl,
	);
	const uniqueActors = [...new Set(allActors)].filter((a) => a !== null);

	return (
		<>
			<Link href={link.url}>
				<Section style={wrapper}>
					{link.imageUrl && (
						<Row>
							<Column style={imgWrapper}>
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
				<Link style={postsLink} href={`${baseUrl}/links/${link.id}`}>
					Shared by {uniqueActors.length}{" "}
					{uniqueActors.length === 1 ? "account" : "accounts"}
				</Link>
			</Text>
		</>
	);
};

const wrapper = {
	maxWidth: "100%",
	margin: "0 0 20px 0",
	borderRadius: "12px",
	border: "#D9D9E0 1px solid",
};

const row = {
	padding: "12px",
};

const imgWrapper = {
	width: "100%",
	aspectRatio: "16 / 9",
};

const img = {
	width: "100%",
	height: "auto",
	borderTopLeftRadius: "12px",
	borderTopRightRadius: "12px",
	objectFit: "cover" as const,
};

const host = {
	margin: 0,
	color: "gray",
	fontSize: "12px",
	lineHeight: 1,
};
const heading = {
	color: "#9E6C00",
	lineHeight: 1.2,
	marginTop: "0.33em",
	marginBottom: "0.33em",
};

const text = {
	color: "black",
	marginTop: "0.33em",
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
	verticalAlign: "top",
	margin: "0 0 0 12px",
};
const postsLink = {
	color: "#9E6C00",
};

export default LinkPost;
