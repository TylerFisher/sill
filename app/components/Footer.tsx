import { Flex, IconButton, Text } from "@radix-ui/themes";
import { ThemeSwitch, useTheme } from "~/routes/resources.theme-switch";
import { Link } from "@remix-run/react";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

const Footer = () => {
	const theme = useTheme();
	return (
		<Flex mb="4" gap="4" align="center" wrap="wrap" justify="end">
			<ThemeSwitch userPreference={theme} />
			<Link
				to="https://github.com/TylerFisher/sill"
				target="_blank"
				rel="noreferrer"
			>
				<IconButton size="3" variant="ghost">
					<GitHubLogoIcon width="22" height="22" />
				</IconButton>
			</Link>
			<Text size="1">
				Built by{" "}
				<Link to="https://tylerjfisher.com" target="_blank" rel="noreferrer">
					Tyler Fisher
				</Link>
			</Text>
		</Flex>
	);
};

export default Footer;
