// app/components/marketing/MainHero.tsx
import { Box, Button, Container, Flex, Heading, Text } from "@radix-ui/themes";
import { Link } from "react-router";
import styles from "./MainHero.module.css";
import Logo from "../nav/Logo";

const MainHero = () => {
	return (
		<Box className={styles.heroWrapper}>
			<Container size="4" px="4">
				<Flex
					direction="column"
					align="center"
					gap={{ initial: "4", sm: "6" }}
					className={styles.heroContent}
				>
					<Box className={styles.logoContainer}>
						<Logo extraBig />
					</Box>

					<Heading
						size={{ initial: "7", sm: "8" }}
						align="center"
						weight="bold"
					>
						Stop doomscrolling. Start discovering.
					</Heading>

					<Text
						size={{ initial: "3", sm: "5" }}
						align="center"
						className={styles.heroText}
						as="p"
					>
						Sill watches your Bluesky and Mastodon feeds to surface the most
						valuable links being shared by your network.
					</Text>
					<Flex
						gap="4"
						direction={{ initial: "column", sm: "row" }}
						width="100%"
					>
						<Link to="/accounts/signup" style={{ width: "100%" }}>
							<Button size="4" variant="solid" style={{ width: "100%" }}>
								Sign up
							</Button>
						</Link>
						<Link to="/accounts/login" style={{ width: "100%" }}>
							<Button size="4" variant="outline" style={{ width: "100%" }}>
								Log in
							</Button>
						</Link>
					</Flex>
				</Flex>
			</Container>
		</Box>
	);
};

export default MainHero;
