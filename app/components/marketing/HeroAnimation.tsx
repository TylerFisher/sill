import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { useState } from "react";
// @ts-expect-error: no types available
import { Scrollama, Step } from "react-scrollama";
import styles from "./HeroAnimation.module.css";

interface Link {
	id: "A" | "B";
	title: string;
}

interface Post {
	id: number;
	link?: Link;
}

interface PostProps {
	post: Post;
	phase: number;
}

interface SortedLink {
	id: Link["id"];
	count: number;
	posts: Post[];
}

interface SillViewProps {
	phase: number;
	links: SortedLink[];
}

const timelinePosts: Post[] = [
	{ id: 1, link: { id: "A", title: "Popular Article" } },
	{ id: 2 },
	{ id: 3, link: { id: "B", title: "Another Article" } },
	{ id: 4, link: { id: "A", title: "Popular Article" } },
	{ id: 5 },
	{ id: 6, link: { id: "A", title: "Popular Article" } },
];

const Post = ({ post, phase }: PostProps) => (
	<Box
		className={`
      ${styles.post}
      ${post.link && phase >= 1 ? styles.highlighted : ""}
    `}
	>
		<Flex gap="3">
			<Box className={styles.avatar} />
			<Flex direction="column" gap="2" style={{ flex: 1 }}>
				<Box className={styles.username} />
				<Box className={styles.postText} />
				{post.link && (
					<Box
						className={`
              ${styles.linkCard}
              ${phase >= 1 ? styles[`linkType${post.link.id}`] : ""}
            `}
					>
						<Flex direction="column" gap="1">
							<Box className={styles.linkTitle} />
							<Box className={styles.linkDomain} />
						</Flex>
					</Box>
				)}
			</Flex>
		</Flex>
	</Box>
);

const SillView = ({ phase, links }: SillViewProps) => (
	<Flex direction="column" gap="3" className={styles.sillContainer}>
		{links.map((link) => (
			<Box
				key={link.id}
				className={`
          ${styles.sillCard}
          ${styles[`linkType${link.id}`]}
          ${phase >= 3 ? styles.expanded : ""}
        `}
			>
				<Flex gap="3">
					<Box className={styles.linkPreview} />
					<Flex direction="column" gap="1" style={{ flex: 1 }}>
						<Box className={styles.linkTitle} />
						<Text size="2" className={styles.shareCount}>
							{link.count} {link.count === 1 ? "share" : "shares"}
						</Text>
					</Flex>
				</Flex>

				{phase >= 3 && (
					<Box className={styles.expandedPosts}>
						{link.posts.map((post) => (
							<Box key={post.id} className={styles.sharedPost}>
								<Flex gap="2" align="center">
									<Box className={styles.avatarSmall} />
									<Box className={styles.username} />
								</Flex>
								<Box className={styles.postText} mt="2" />
							</Box>
						))}
					</Box>
				)}
			</Box>
		))}
	</Flex>
);

const ScrollingPosts = ({ posts, phase }: { posts: Post[]; phase: number }) => (
	<Box className={styles.scrollContainer}>
		<Box className={styles.scrollContent}>
			{[...Array(3)].map((item, i) => (
				<Flex key={item} direction="column" gap="3" mb="3">
					{posts.map((post) => (
						<Post key={`${i}-${post.id}`} post={post} phase={phase} />
					))}
				</Flex>
			))}
		</Box>
	</Box>
);

const steps = [
	{
		title: "Your Timeline",
		description:
			"This is your social media timeline. An endless feed of posts.",
		index: 0,
	},
	{
		title: "Link Sharing",
		description:
			"Many posts in your timeline contain links. Often, multiple people are sharing the same link. But it can be hard to follow the discussion around that link with so much other noise in your timeline.",
		index: 1,
	},
	{
		title: "Sill",
		description:
			"Sill watches your timeline for links. Links are grouped and sorted by how many times they've been shared.",
		index: 2,
	},
	{
		title: "Discussion",
		description: "You can also see who shared each link and what they said.",
		index: 3,
	},
	{
		title: "Benefit",
		description:
			"Sill helps you stay informed without the endless scroll. Easily follow the day's biggest stories and discussion.",
		index: 4,
	},
];

const HeroAnimation = () => {
	const [currentPhase, setCurrentPhase] = useState(0);
	const sortedLinks: SortedLink[] = [
		{
			id: "A",
			count: 3,
			posts: timelinePosts.filter((post) => post.link?.id === "A"),
		},
		{
			id: "B",
			count: 1,
			posts: timelinePosts.filter((post) => post.link?.id === "B"),
		},
	];

	const onStepEnter = ({ data }: { data: number }) => {
		setCurrentPhase(data);
	};

	return (
		<Box className={styles.wrapper}>
			<Box className={styles.sticky}>
				<Box width="100%">
					<Box mb="4">
						<Heading size="8" align="center">
							How Sill Works
						</Heading>
					</Box>
					<Box
						className={`
    ${styles.container} 
    ${currentPhase >= 2 ? styles.showSill : ""} 
    ${currentPhase >= 4 ? styles.hiddenTimeline : ""}
  `}
					>
						<Box
							className={`${styles.column} ${currentPhase >= 4 ? styles.fadeOut : ""}`}
						>
							<Text className={styles.columnHeader}>Your Timeline</Text>
							<ScrollingPosts posts={timelinePosts} phase={currentPhase} />
						</Box>

						<Box
							className={`${styles.column} ${styles.sillColumn} ${currentPhase >= 2 ? styles.visible : ""}`}
						>
							<Text className={`${styles.columnHeader} ${styles.sillHeader}`}>
								sill
							</Text>
							<Box className={styles.posts}>
								<SillView phase={currentPhase} links={sortedLinks} />
							</Box>
						</Box>
					</Box>
				</Box>
			</Box>

			<Box className={styles.steps}>
				<Scrollama offset={0.9} onStepEnter={onStepEnter}>
					{steps.map((step) => (
						<Step data={step.index} key={step.title}>
							<Box
								className={styles.step}
								data-active={currentPhase === step.index}
							>
								<Box className={styles.stepContent}>
									<Text size="3">{step.description}</Text>
								</Box>
							</Box>
						</Step>
					))}
				</Scrollama>
			</Box>
		</Box>
	);
};

export default HeroAnimation;
