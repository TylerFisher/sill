import { Box, Card, Flex, Heading, Text } from "@radix-ui/themes";
import styles from "./Feature.module.css";

interface FeatureProps {
	title: string;
	description: string;
}

const Feature = ({ title, description }: FeatureProps) => {
	return (
		<Card size="4" className={styles["feature-wrapper"]}>
			<Box>
				<Heading as="h2" size="6" mb="4" className={styles["feature-heading"]}>
					{title}
				</Heading>
				<Text as="p" size="5">
					{description}
				</Text>
			</Box>
		</Card>
	);
};

export default Feature;
