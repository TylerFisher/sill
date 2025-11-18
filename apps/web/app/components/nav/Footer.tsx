import { Box, Flex, Link, Text } from "@radix-ui/themes";
import { useLocation } from "react-router";
import { LayoutSwitch, useLayout } from "~/routes/resources/layout-switch";
import { ThemeSwitch, useTheme } from "~/routes/resources/theme-switch";
import styles from "./Footer.module.css";

const Footer = ({
	layoutFormId,
	themeFormId,
}: { layoutFormId: string; themeFormId: string }) => {
	const theme = useTheme();
	const layout = useLayout();
	const location = useLocation();

	return (
		<Box className={styles.footer}>
			<Flex gap="2" direction="row" align="center" wrap="wrap">
				{(location.pathname.includes("/links") ||
					location.pathname.includes("digest") ||
					location.pathname.includes("bookmarks")) && (
					<>
						<LayoutSwitch userPreference={layout} id={layoutFormId} /> ·
					</>
				)}
				<ThemeSwitch userPreference={theme} id={themeFormId} />
			</Flex>
			<Flex mb="1" gap="1" direction="row" align="center" wrap="wrap">
				<>
					<Text size="1">
						<Link href="https://terms.sill.social/terms.html">Terms</Link>
					</Text>
					·
					<Text size="1">
						<Link href="https://terms.sill.social/privacy.html">Privacy</Link>
					</Text>
					·
					<Text size="1">
						<Link href="https://terms.sill.social/copyright.html">DMCA</Link>
					</Text>
				</>
			</Flex>
			<Flex mb="4" gap="2" direction="row" align="center" wrap="wrap">
				<Text size="1">
					Built by <Link href="https://euphonos.studio">Euphonos</Link>
				</Text>
			</Flex>
		</Box>
	);
};

export default Footer;
