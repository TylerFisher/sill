// app/components/marketing/MainHero.tsx
import { Box, Button, Flex, Heading, Text } from "@radix-ui/themes";
import { Link } from "react-router";
import styles from "./MainHero.module.css";
import Logo from "../nav/Logo";
import { useTheme } from "~/routes/resources/theme-switch";

const MainHero = () => {
	const theme = useTheme();

	return (
		<Flex
			className={styles.heroWrapper}
			align="end"
			pt="9"
			px={{
				initial: "4",
				sm: "9",
			}}
		>
			<Flex
				direction={{ initial: "column", sm: "row" }}
				gap="6"
				justify="between"
				align="center"
			>
				<Flex
					direction="column"
					align={{ initial: "center", sm: "start" }}
					gap={{ initial: "4", sm: "6" }}
					className={styles.heroContent}
				>
					<Box className={styles.logoContainer}>
						<Logo extraBig />
					</Box>

					<Heading
						size={{ initial: "7", sm: "8" }}
						align={{ initial: "center", sm: "left" }}
						weight="bold"
					>
						News from your social networks, <br /> on your time
					</Heading>

					<Text
						size={{ initial: "3", sm: "5" }}
						align={{ initial: "center", sm: "left" }}
						className={styles.heroText}
						as="p"
						color="gray"
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
							<Button
								size={{
									initial: "3",
									sm: "4",
								}}
								variant="solid"
								style={{ width: "100%" }}
							>
								Sign up
							</Button>
						</Link>
						<Link to="/accounts/login" style={{ width: "100%" }}>
							<Button
								size={{
									initial: "3",
									sm: "4",
								}}
								variant="outline"
								style={{ width: "100%" }}
							>
								Log in
							</Button>
						</Link>
					</Flex>
				</Flex>

				{/* Right image container */}
				<Box style={{ flex: 1 }}>
					<img
						src={
							theme === "light" ? "/marketing/ui.png" : "/marketing/ui-dark.png"
						}
						alt="Screenshot of Sill web interface"
						style={{
							width: "100%",
							height: "auto",
						}}
					/>
				</Box>
			</Flex>
		</Flex>
	);
};

export default MainHero;
