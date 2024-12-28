import { Flex, Text } from "@radix-ui/themes";
import styles from "./NumberRanking.module.css";

const NumberRanking = ({
	ranking,
	layout,
}: { ranking: number; layout: "default" | "dense" }) => {
	return (
		<Flex
			justify="center"
			align="center"
			className={styles["ranking-wrapper"]}
			width={layout === "dense" ? "30px" : "40px"}
			height={layout === "dense" ? "30px" : "40px"}
			top={layout === "dense" ? "5px" : "10px"}
			right={layout === "dense" ? "5px" : "10px"}
		>
			<Text
				size={layout === "dense" ? "4" : "5"}
				className={styles["ranking-number"]}
			>
				{ranking}
			</Text>
		</Flex>
	);
};

export default NumberRanking;
