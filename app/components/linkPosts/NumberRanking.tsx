import { Flex, Text } from "@radix-ui/themes";
import styles from "./NumberRanking.module.css";

const NumberRanking = ({ ranking }: { ranking: number }) => {
	return (
		<Flex justify="center" align="center" className={styles["ranking-wrapper"]}>
			<Text size="5" className={styles["ranking-number"]}>
				{ranking}
			</Text>
		</Flex>
	);
};

export default NumberRanking;
