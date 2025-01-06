import {
	Column,
	Heading,
	Img,
	Link,
	Row,
	Section,
	Text,
} from "@react-email/components";
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
				<Row style={row}>
					<Column style={avatarWrapper}>
						<Link href={post.actorUrl}>
							<Img
								src={post.actorAvatarUrl || ""}
								style={avatar(reposters.length > 0)}
							/>
						</Link>
					</Column>
					<Column>
						<Row>
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
						</Row>
						<Row>
							<Text
								dangerouslySetInnerHTML={{
									__html: post.postText,
								}}
								style={postText}
							/>
							{post.quotedPostText && (
								<Section style={wrapper}>
									<Row style={quotedActorRow}>
										<Column style={quotedActorWrapper}>
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
													<Link
														href={post.quotedActorUrl || ""}
														style={actorLink}
													>
														<strong>{post.quotedActorName}</strong>{" "}
														<span style={handle}>
															@{post.quotedActorHandle}
														</span>
													</Link>
												</Text>
											</div>
										</Column>
									</Row>
									<Row style={quotedTextRow}>
										<Text
											dangerouslySetInnerHTML={{
												__html: post.quotedPostText,
											}}
											style={postText}
										/>
									</Row>
								</Section>
							)}
						</Row>
						<Text style={viewPost}>
							<Link href={post.postUrl} style={viewPostLink}>
								View post on{" "}
								{post.postType.charAt(0).toUpperCase() + post.postType.slice(1)}{" "}
								→
							</Link>
						</Text>
					</Column>
				</Row>
			</Section>
		</div>
	);
};

const container = {
	maxWidth: "500px",
	margin: "0 auto",
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

const avatarWrapper = {
	verticalAlign: "top",
	maxWidth: "50px",
};

const avatar = (reposts: boolean) => ({
	width: "40px",
	height: "40px",
	borderRadius: "50%",
	marginRight: "10px",
	marginTop: reposts ? "10px" : "0",
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

const postText = {
	margin: "0 0 16px",
};

const quotedActorRow = {
	padding: "12px 12px 0",
};

const quotedTextRow = {
	padding: "0 12px",
};

const quotedActorWrapper = {
	verticalAlign: "top",
};

const quotedAvatarWrapper = {
	maxWidth: "25px",
	display: "inline-block",
	verticalAlign: "bottom",
};

const quotedActor = {
	display: "inline-block",
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
