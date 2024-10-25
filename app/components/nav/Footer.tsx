import { Flex, IconButton, Text, Link } from "@radix-ui/themes";
import { ThemeSwitch, useTheme } from "~/routes/resources.theme-switch";
import { Github } from "lucide-react";

const Footer = ({
	align,
}: { align: "center" | "start" | "end" | "between" }) => {
	const theme = useTheme();
	return (
		<Flex mb="4" gap="4" align="center" wrap="wrap" justify={align}>
			<ThemeSwitch userPreference={theme} />
			<Link
				href="https://github.com/TylerFisher/sill"
				target="_blank"
				rel="noreferrer"
			>
				<IconButton size="3" variant="ghost">
					<Github />
				</IconButton>
			</Link>
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
