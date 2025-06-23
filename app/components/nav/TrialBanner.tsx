import { Flex, Text } from "@radix-ui/themes";
import { Link } from "react-router";
import styles from "./TrialBanner.module.css";
import { daysRemaining } from "~/utils/misc";

const TrialBanner = ({ endDate }: { endDate: Date }) => {
	const remaining = daysRemaining(endDate);
	const days = remaining === 1 ? "day" : "days";
	return (
		<Flex
			justify="center"
			align="center"
			py="2"
			px="4"
			className={styles.banner}
		>
			<Text className={styles.text}>
				<span className={styles.desktop}>
					{remaining} {days} left in your{" "}
					<Text
						color="yellow"
						style={{
							fontWeight: 900,
							fontStyle: "italic",
						}}
					>
						sill+
					</Text>{" "}
					trial. <Link to="/settings/subscription">Subscribe now</Link>.
				</span>
				<span className={styles.mobile}>
					{remaining} {days} of{" "}
					<Text
						color="yellow"
						style={{
							fontWeight: 900,
							fontStyle: "italic",
						}}
					>
						sill+
					</Text>{" "}
					left. <Link to="/settings/subscription">Subscribe now</Link>.
				</span>
			</Text>
		</Flex>
	);
};

export default TrialBanner;
