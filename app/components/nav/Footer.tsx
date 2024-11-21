import { Flex, IconButton, Link, Text } from "@radix-ui/themes";
import { Github } from "lucide-react";
import { ThemeSwitch, useTheme } from "~/routes/resources.theme-switch";
import styles from "./Footer.module.css";

const Footer = () => {
	const theme = useTheme();
	return (
		<Flex mb="4" gap="4" align="center" wrap="wrap" className={styles.footer}>
			<ThemeSwitch userPreference={theme} />
			<Link
				href="https://github.com/TylerFisher/sill"
				target="_blank"
				rel="noreferrer"
				aria-label="Link to Github repository for Sill"
			>
				<IconButton size="3" variant="ghost" aria-label="Github icon">
					<Github />
				</IconButton>
			</Link>
			<Text size="1">
				<Link href="https://terms.sill.social/privacy.html">Privacy</Link>
			</Text>
			<Text size="1">
				Built by{" "}
				<Link href="https://tylerjfisher.com" target="_blank" rel="noreferrer">
					Tyler Fisher
				</Link>
			</Text>
		</Flex>
	);
};

export default Footer;
