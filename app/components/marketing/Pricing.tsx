// app/components/marketing/Pricing.tsx
import { Box, Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { Link } from "react-router";
import { CheckCircle2 } from "lucide-react";
import styles from "./Pricing.module.css";

const Pricing = () => {
	return (
		<Box py="9" id="pricing">
			<Heading size="8" align="center" mb="6">
				Simple, transparent pricing
			</Heading>

			<Flex
				gap="4"
				direction={{ initial: "column", md: "row" }}
				justify="center"
			>
				<Card className={styles.card}>
					<Flex direction="column" gap="4">
						<Box>
							<Heading size="5" mb="2">
								Free
							</Heading>
							<Text size="6" weight="bold">
								$0
							</Text>
						</Box>

						<Box>
							<ul className={styles.featureList}>
								<li>
									<CheckCircle2 className={styles.checkIcon} />
									Connect Bluesky and Mastodon
								</li>
								<li>
									<CheckCircle2 className={styles.checkIcon} />
									Popular links ranked by your network
								</li>
								<li>
									<CheckCircle2 className={styles.checkIcon} />
									Web interface for browsing links
								</li>
							</ul>
						</Box>

						<Link to="/accounts/signup">
							<Button size="3" variant="outline" style={{ width: "100%" }}>
								Get started
							</Button>
						</Link>
					</Flex>
				</Card>

				<Card className={styles.cardHighlighted}>
					<Flex direction="column" gap="4">
						<Box>
							<Heading size="5" mb="2">
								Sill+
							</Heading>
							<Text size="6" weight="bold">
								$5/month
							</Text>{" "}
							<Text color="gray" size="2">
								or $50/year
							</Text>
						</Box>

						<Box>
							<ul className={styles.featureList}>
								<li>
									<CheckCircle2 className={styles.checkIcon} />
									Everything in Free
								</li>
								<li>
									<CheckCircle2 className={styles.checkIcon} />
									Daily Digest via email or RSS
								</li>
								<li>
									<CheckCircle2 className={styles.checkIcon} />
									Custom notifications for specific events
								</li>
								<li>
									<CheckCircle2 className={styles.checkIcon} />
									Watch custom lists and feeds
								</li>
							</ul>
						</Box>

						<Link to="/accounts/signup">
							<Button size="3" style={{ width: "100%" }}>
								Try free for 14 days
							</Button>
						</Link>
					</Flex>
				</Card>
			</Flex>
		</Box>
	);
};

export default Pricing;
