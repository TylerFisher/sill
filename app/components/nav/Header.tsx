import { Box, Dialog, IconButton } from "@radix-ui/themes";
import styles from "./Header.module.css";
import Nav from "./Nav";
import { Menu } from "lucide-react";
import Logo from "./Logo";

const Header = ({
	headerClass,
	hideNav,
}: { headerClass: string; hideNav: boolean }) => {
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
				<Logo />
			</Box>
		</header>
	);
};

export default Header;
