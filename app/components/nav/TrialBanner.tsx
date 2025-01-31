import { Flex, Text } from "@radix-ui/themes";
import { Link } from "react-router";
import styles from "./TrialBanner.module.css";

const TrialBanner = () => {
	return (
		<Flex justify="center" align="center" py="2" className={styles.banner}>
			<Text>
				You are on a free trial of Sill+.{" "}
				<Link to="/settings/subscription">Subscribe now</Link>.
			</Text>
		</Flex>
	);
};

export default TrialBanner;
