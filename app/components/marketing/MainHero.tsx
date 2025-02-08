// app/components/marketing/MainHero.tsx
import {
	Box,
	Button,
	Callout,
	Flex,
	Heading,
	Text,
	Link as RLink,
} from "@radix-ui/themes";
import { Link } from "react-router";
import styles from "./MainHero.module.css";
import Logo from "../nav/Logo";
import { useTheme } from "~/routes/resources/theme-switch";
import { CircleAlert } from "lucide-react";

const MainHero = () => {
	const theme = useTheme();

	return (
		<Flex
			className={styles.heroWrapper}
			align="end"
			py={{
				initial: "6",
				sm: "9",
			}}
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
				className={styles.heroContainer}
			>
				<Flex
					direction="column"
					align={{ initial: "center", sm: "start" }}
					gap={{ initial: "4", sm: "4" }}
					className={styles.heroContent}
				>
					<Box className={styles.logoContainer}>
						<Logo extraBig />
					</Box>

					<Heading
						size={{ initial: "5", sm: "7" }}
						align={{ initial: "center", sm: "left" }}
						weight="bold"
						mb="0"
						style={{
							textWrap: "balance",
						}}
					>
						Top news shared by the people you trust
					</Heading>

					<Text
						size={{ initial: "3", sm: "5" }}
						align={{ initial: "center", sm: "left" }}
						className={styles.heroText}
						as="p"
						color="gray"
						mt="0"
					>
						Sill monitors your Bluesky and Mastodon feeds to find the most
						popular links in your network.
					</Text>
					<Flex gap="4" width="100%" mt="2">
						<Link to="/accounts/signup" style={{ width: "100%" }}>
							<Button
								size={{
									initial: "2",
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
									initial: "2",
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
