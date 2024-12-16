import {
	Box,
	Button,
	Card,
	Flex,
	Inset,
	Link as RLink,
	Text,
} from "@radix-ui/themes";
import { Link } from "react-router";
import styles from "./Hero.module.css";
import Logo from "../nav/Logo";

const Hero = () => {
	return (
		<Box className={styles["hero-wrapper"]}>
			<Flex
				mb="8"
				direction="row"
				justify="center"
				align="center"
				wrap={{
					initial: "wrap",
					md: "nowrap",
				}}
				gap="8"
			>
				<Flex
					direction="column"
					justify="center"
					align="center"
					gap={{
						initial: "4",
						md: "6",
					}}
					className={styles.language}
				>
					<Logo extraBig />
					<Box>
						<Text as="p" size="7" align="center" mb="4" className={styles.lede}>
							Top news shared by <strong>the people you trust</strong>
						</Text>
						<Text as="p" size="4" align="center">
							Sill finds the most popular links in your{" "}
							<RLink href="https://bsky.app">Bluesky</RLink> and{" "}
							<RLink href="https://joinmastodon.org">Mastodon</RLink> feeds to
							give you a clear picture of what&rsquo;s happening.
						</Text>
					</Box>
					<Flex gap="3">
						<Link to="accounts/signup">
							<Button size="4">Sign up</Button>
						</Link>
						<Link to="accounts/login">
							<Button size="4">Log in</Button>
						</Link>
					</Flex>
				</Flex>
				<Box className={styles["right-box"]}>
					<Card className={styles["intro-video-wrapper"]}>
						<Inset>
							<video
								className={styles["intro-video"]}
								src="/timeline.mp4"
								autoPlay
								loop
								muted
								playsInline
							/>
						</Inset>
					</Card>
				</Box>
			</Flex>
			{/* <Footer themeFormId="hero-theme" layoutFormId="hero-layout" /> */}
			<Box mb="4">
				<Flex
					mb="4"
					gap="2"
					direction="row"
					align="center"
					justify="center"
					wrap="wrap"
				>
					<Text size="1">
						<RLink href="https://terms.sill.social/privacy.html">Privacy</RLink>
					</Text>
					·
					<Text size="1">
						Built by{" "}
						<RLink href="https://www.tylerjfisher.com">Tyler Fisher</RLink>
					</Text>
				</Flex>
			</Box>
		</Box>
	);
};

export default Hero;
