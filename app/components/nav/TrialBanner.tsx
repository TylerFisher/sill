import { Flex, Text } from "@radix-ui/themes";
import { Link } from "react-router";
import styles from "./TrialBanner.module.css";
import { daysRemaining } from "~/utils/misc";

const TrialBanner = ({ endDate }: { endDate: Date }) => {
	return (
		<Flex
			justify="center"
			align="center"
			py="2"
			px="4"
			className={styles.banner}
		>
			<Text>
				You have {daysRemaining(endDate)} days remaining in your Sill+ free
				trial. <Link to="/settings/subscription">Subscribe now</Link>.
			</Text>
		</Flex>
	);
};

export default TrialBanner;
