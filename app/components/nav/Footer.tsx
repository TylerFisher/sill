import { Flex, Link, Text } from "@radix-ui/themes";
import { ThemeSwitch, useTheme } from "~/routes/resources.theme-switch";
import styles from "./Footer.module.css";
import { useLocation } from "@remix-run/react";
import { LayoutSwitch, useLayout } from "~/routes/resources.layout-switch";

const Footer = () => {
	const theme = useTheme();
	const layout = useLayout();
	const location = useLocation();
	return (
		<Flex mb="4" gap="4" align="center" wrap="wrap" className={styles.footer}>
			{location.pathname.includes("/links") && (
				<LayoutSwitch userPreference={layout} />
			)}
			<ThemeSwitch userPreference={theme} />
			<Text size="1">
				<Link href="https://terms.sill.social/privacy.html">Privacy</Link>
			</Text>
		</Flex>
	);
};

export default Footer;
