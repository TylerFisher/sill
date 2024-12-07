import { Box, Flex, Link, Text } from "@radix-ui/themes";
import { ThemeSwitch, useTheme } from "~/routes/resources.theme-switch";
import styles from "./Footer.module.css";
import { useLocation } from "@remix-run/react";
import { LayoutSwitch, useLayout } from "~/routes/resources.layout-switch";

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
				{location.pathname.includes("/links") && (
					<>
						<LayoutSwitch userPreference={layout} id={layoutFormId} /> ·
					</>
				)}
				<ThemeSwitch userPreference={theme} id={themeFormId} />
			</Flex>
			<Flex mb="4" gap="2" direction="row" align="center" wrap="wrap">
				<Text size="1">
					<Link href="https://terms.sill.social/privacy.html">Privacy</Link>
				</Text>
				·
				<Text size="1">
					Built by <Link href="https://www.tylerjfisher.com">Tyler Fisher</Link>
				</Text>
			</Flex>
		</Box>
	);
};

export default Footer;
