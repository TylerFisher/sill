import { Flex, Text } from "@radix-ui/themes";
import { Link } from "react-router";
import styles from "./TrialBanner.module.css";
import { daysRemaining } from "~/utils/misc";

const TrialBanner = ({ endDate }: { endDate: Date }) => {
	const remaining = daysRemaining(endDate);
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

	const subscribeLink = <Link to="/settings/subscription">Subscribe now</Link>;

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
