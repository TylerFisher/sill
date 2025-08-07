import {
	Column,
	Heading,
	Img,
	Link,
	Markdown,
	Row,
	Section,
	Text,
} from "@react-email/components";
import { NodeHtmlMarkdown } from "node-html-markdown";
import type { linkPostDenormalized } from "~/drizzle/schema.server";

const Post = ({
	group,
}: { group: (typeof linkPostDenormalized.$inferSelect)[] }) => {
	const post = group[0];
	const reposters = group
		.filter((l) => l.repostActorHandle !== l.actorHandle && l.repostActorHandle)
		.filter((l) => l !== undefined);

	return (
		<div style={container}>
			<Section style={wrapper}>
				<Row>
					<Column style={actorWrapper}>
						<div style={avatarWrapper}>
							<Link href={post.actorUrl}>
								<Img
									src={post.actorAvatarUrl || ""}
									style={avatar(reposters.length > 0)}
								/>
							</Link>
						</div>
						<div style={actorText}>
							{reposters.length > 1 && (
								<Text style={repostText}>
									Reposted by {reposters.length} people
								</Text>
							)}
							{reposters.length === 1 && (
								<Text style={repostText}>
									<Link href={post.repostActorUrl || ""} style={repostLink}>
										Reposted by {reposters[0].repostActorName}
									</Link>
								</Text>
							)}
							<Text style={actor}>
								<Link href={post.actorUrl} style={actorLink}>
									<strong>{post.actorName}</strong>{" "}
									<span style={handle}>@{post.actorHandle}</span>
								</Link>
							</Text>
						</div>
					</Column>
				</Row>
				<Row style={bottomRow}>
					<Markdown
						markdownCustomStyles={{
							link: { color: "#9E6C00", textDecoration: "none" },
							p: {
								margin: 0,
								fontSize: "14px",
								lineHeight: "24px",
								padding: "0 0 16px",
							},
						}}
					>
						{NodeHtmlMarkdown.translate(post.postText)}
					</Markdown>
					{post.postImages?.map((image) => (
						<Img
							key={image.url}
							src={image.url}
							alt={image.alt}
							style={{ width: "100%", height: "auto", margin: "0 0 16px" }}
						/>
					))}
					{post.quotedPostText && (
						<Section style={wrapper}>
							<Row>
								<Column style={actorWrapper}>
									<div style={quotedAvatarWrapper}>
										<Link href={post.quotedActorUrl || ""}>
											<Img
												src={post.quotedActorAvatarUrl || ""}
												style={quotedAvatar}
											/>
										</Link>
									</div>
									<div style={quotedActor}>
										<Text style={actor}>
											<Link href={post.quotedActorUrl || ""} style={actorLink}>
												<strong>{post.quotedActorName}</strong>{" "}
												<span style={handle}>@{post.quotedActorHandle}</span>
											</Link>
										</Text>
									</div>
								</Column>
							</Row>
							<Row>
								<Markdown
									markdownCustomStyles={{
										link: { color: "#9E6C00", textDecoration: "none" },
										p: {
											margin: 0,
											fontSize: "14px",
											lineHeight: "24px",
											padding: "0 0 16px",
										},
									}}
								>
									{NodeHtmlMarkdown.translate(post.quotedPostText)}
								</Markdown>
								{post.quotedPostImages?.map((image) => (
									<Img
										key={image.url}
										src={image.url}
										alt={image.alt}
										style={{
											width: "100%",
											height: "auto",
											margin: "0 0 16px",
										}}
									/>
								))}
							</Row>
						</Section>
					)}
					<Text style={viewPost}>
						<Link href={post.postUrl} style={viewPostLink}>
							View post on{" "}
							{post.postType.charAt(0).toUpperCase() + post.postType.slice(1)} →
						</Link>
					</Text>
				</Row>
			</Section>
		</div>
	);
};

const container = {
	maxWidth: "500px",
	margin: "0 auto",
	width: "100%",
};

const wrapper = {
	maxWidth: "100%",
	width: "100%",
	margin: "0 0 20px 0",
	borderRadius: "12px",
	border: "#D9D9E0 1px solid",
	padding: "12px",
};

const actorWrapper = {
	verticalAlign: "top",
};

const actorText = {
	display: "block",
};

const avatarWrapper = {
	verticalAlign: "top",
	maxWidth: "37.5px",
	display: "block",
	float: "left" as const,
};

const avatar = (reposts: boolean) => ({
	width: "30px",
	height: "30px",
	borderRadius: "50%",
	marginRight: "7.5px",
	marginTop: reposts ? "7.5px" : "0",
});

const repostText = {
	margin: "0",
	fontSize: "12px",
	color: "#999",
	lineHeight: "1",
};

const repostLink = {
	color: "#999",
};

const actor = {
	margin: 0,
};

const actorLink = {
	color: "#9E6C00",
};

const handle = {
	color: "#999",
};

const bottomRow = {
	padding: "6px 0 12px",
};

const quotedAvatarWrapper = {
	maxWidth: "25px",
	display: "block",
	float: "left" as const,
	verticalAlign: "bottom",
};

const quotedActor = {
	display: "block",
};

const quotedAvatar = {
	width: "20px",
	height: "20px",
	borderRadius: "50%",
	marginTop: "2.5px",
	marginRight: "5px",
};

const viewPost = {
	margin: 0,
};

const viewPostLink = {
	color: "#9E6C00",
};

export default Post;
