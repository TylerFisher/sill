// app/components/marketing/MarketingFooter.tsx
import { Box, Container, Flex, Link as RLink, Text } from "@radix-ui/themes";
import styles from "./MarketingFooter.module.css";

const MarketingFooter = () => {
	return (
		<Box className={styles.footer}>
			<Container>
				<Flex
					justify="between"
					align="center"
					direction={{ initial: "column", sm: "row" }}
					gap="4"
				>
					<Flex gap="4" wrap="wrap" justify="center">
						<RLink href="https://terms.sill.social/privacy.html">
							Privacy Policy
						</RLink>
						<RLink href="https://terms.sill.social/terms.html">
							Terms of Service
						</RLink>
					</Flex>

					<Flex gap="4" wrap="wrap" justify="center">
						<Text align="center">
							Built by <RLink href="https://euphonos.studio">Euphonos</RLink>
						</Text>
						<RLink href="https://bsky.app/profile/sill.social">
							<img
								src="/bluesky-logo.svg"
								width="18"
								height="18"
								alt="Bluesky"
							/>
						</RLink>
					</Flex>
				</Flex>
			</Container>
		</Box>
	);
};

export default MarketingFooter;
