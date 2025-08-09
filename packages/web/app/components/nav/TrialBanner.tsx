import { Callout, Flex, Link, Text } from "@radix-ui/themes";
import { daysRemaining } from "~/utils/misc";
import styles from "./TrialBanner.module.css";

const TrialBanner = ({ endDate }: { endDate: Date }) => {
	const remaining = daysRemaining(new Date(endDate));
	const days = remaining === 1 ? "day" : "days";

	const sillPlusText = (
		<Text
			color="yellow"
			style={{
				fontWeight: 900,
				fontStyle: "italic",
			}}
		>
			sill+
		</Text>
	);

	const subscribeLink = (
		<Link highContrast href="/settings/subscription">
			Subscribe now
		</Link>
	);

	return (
		<Flex
			justify="center"
			align="center"
			py="2"
			px="4"
			className={styles.banner}
		>
			<Text className={styles.text}>
				{remaining} {days} left in your {sillPlusText} trial. {subscribeLink}.
			</Text>
		</Flex>
	);
};

export default TrialBanner;
