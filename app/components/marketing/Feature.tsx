import { Flex, Box, Heading, Text, Card } from "@radix-ui/themes";
import styles from "./Feature.module.css";

interface FeatureProps {
	title: string;
	description: string;
	image: string;
	align?: "left" | "right";
}

const Feature = ({ title, description, image, align }: FeatureProps) => {
	return (
		<Card mb="8" size="4">
			<Flex
				gap="4"
				direction={align === "left" ? "row" : "row-reverse"}
				wrap="wrap"
			>
				<Box className={styles["feature-wrapper"]}>
					<Heading
						as="h2"
						size="8"
						mb="4"
						className={styles["feature-heading"]}
					>
						{title}
					</Heading>
					<Text as="p" size="5">
						{description}
					</Text>
				</Box>
				<Box className={styles["feature-wrapper"]}>
					<Text>{image}</Text>
				</Box>
			</Flex>
		</Card>
	);
};

export default Feature;
