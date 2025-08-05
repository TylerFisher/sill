import { Box, Button, Dialog, IconButton, Text } from "@radix-ui/themes";
import { Menu } from "lucide-react";
import { NavLink } from "react-router";
import { useTheme } from "~/routes/resources/theme-switch";
import type { SubscriptionStatus } from "~/utils/auth.server";
import styles from "./Header.module.css";
import Logo from "./Logo";
import Nav from "./Nav";

const Header = ({
	headerClass,
	hideNav,
	subscribed,
}: {
	headerClass: string;
	hideNav: boolean;
	subscribed?: SubscriptionStatus;
}) => {
	const theme = useTheme();

	return (
		<header className={styles[headerClass]}>
			<Box
				position={{
					initial: "fixed",
					md: "relative",
				}}
				top="0"
				width="100%"
				mx={{
					initial: "0",
					sm: "-6",
					md: "0",
				}}
				style={{
					backgroundColor:
						theme === "dark" ? "rgba(25,25,24,0.8)" : "rgba(249,249,248,0.8)",
				}}
				className={styles["header-wrapper"]}
			>
				{!hideNav && (
					<Box
						position="absolute"
						top="1.1rem"
						left="1rem"
						display={{
							initial: "inline-block",
							md: "none",
						}}
					>
						<Dialog.Root>
							<Dialog.Trigger>
								<IconButton variant="ghost">
									<Menu />
								</IconButton>
							</Dialog.Trigger>
							<Dialog.Content className={styles["dialog-content"]}>
								<Nav layoutFormId="mobile-layout" themeFormId="mobile-theme" />
							</Dialog.Content>
						</Dialog.Root>
					</Box>
				)}
				<Logo subscribed={subscribed} />
				{subscribed === "free" && (
					<Box
						position="absolute"
						top="0.8rem"
						right="1rem"
						display={{
							initial: "inline-block",
							md: "none",
						}}
					>
						<NavLink to="/settings/subscription">
							<Button variant="soft">
								Get
								<Text
									style={{
										fontWeight: 900,
										fontStyle: "italic",
										marginTop: "1px",
									}}
									ml="-1"
								>
									sill+
								</Text>
							</Button>
						</NavLink>
					</Box>
				)}
			</Box>
		</header>
	);
};

export default Header;
