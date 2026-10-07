// app/components/marketing/MainHero.tsx
import {
	Box,
	Flex,
	Heading,
	Link as RLink,
	Separator,
	Text,
} from "@radix-ui/themes";
import { Link, useSearchParams } from "react-router";
import { useTheme } from "~/routes/resources/theme-switch";
import BlueskyAuthForm from "../forms/BlueskyAuthForm";
import MastodonAuthForm from "../forms/MastodonAuthForm";
import Logo from "../nav/Logo";
import styles from "./MainHero.module.css";

const MainHero = () => {
	const theme = useTheme();
	const [searchParams] = useSearchParams();

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
					<Box width="100%" mt="2">
						<BlueskyAuthForm
							mode="login"
							searchParams={searchParams}
							buttonLabel="See your top links"
						/>
						<Flex align="center" gap="3" mb="4">
							<Separator style={{ flex: 1 }} />
							<Text size="2" color="gray">
								or
							</Text>
							<Separator style={{ flex: 1 }} />
						</Flex>
						<MastodonAuthForm
							mode="login"
							searchParams={searchParams}
							buttonLabel="See your top links"
						/>
						<Text size="2" color="gray">
							Signed up with email?{" "}
							<RLink asChild>
								<Link to="/accounts/login">Log in here</Link>
							</RLink>
						</Text>
					</Box>
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
