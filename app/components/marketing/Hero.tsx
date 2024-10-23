import { Box, Button, Flex, Text, Link as RLink } from "@radix-ui/themes";
import { Link } from "@remix-run/react";
import Header from "~/components/Header";
import styles from "./Hero.module.css";

const Hero = () => {
	return (
		<Flex
			mb="8"
			direction="column"
			justify="center"
			align="center"
			gap="8"
			className={styles["hero-wrapper"]}
		>
			<Header headerClass="marketing-logo" />
			<Box>
				<Text as="p" size="8" align="center" mb="4" className={styles.lede}>
					Get news from the <strong>people you trust</strong>.
				</Text>
				<Text as="p" size="6" align="center">
					Sill connects to your <RLink href="https://bsky.app">Bluesky</RLink>{" "}
					and <RLink href="https://joinmastodon.org">Mastodon</RLink> accounts
					and collects the links shared by the people you follow.
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
	);
};

export default Hero;
