import { Box, Dialog, IconButton } from "@radix-ui/themes";
import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { useTheme } from "~/routes/resources/theme-switch";
import type { SubscriptionStatus } from "@sill/schema";
import styles from "./Header.module.css";
import Logo from "./Logo";
import Nav from "./Nav";

const Header = ({
	headerClass,
	hideNav,
	subscribed,
	action,
}: {
	headerClass: string;
	hideNav: boolean;
	subscribed?: SubscriptionStatus;
	// Optional control pinned to the top-right of the mobile header.
	action?: ReactNode;
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
						theme === "dark" ? "rgba(25,25,24)" : "rgba(249,249,248)",
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
				{action && (
					<Box
						position="absolute"
						top="1.1rem"
						right="1rem"
						display={{
							initial: "inline-block",
							sm: "none",
						}}
					>
						{action}
					</Box>
				)}
			</Box>
		</header>
	);
};

export default Header;
