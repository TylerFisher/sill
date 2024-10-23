import { Flex, Box, Heading, Text } from "@radix-ui/themes";
import styles from "./Feature.module.css";

interface FeatureProps {
	title: string;
	description: string;
	image: string;
	align?: "left" | "right";
}

const Feature = ({ title, description, image, align }: FeatureProps) => {
	return (
		<Flex gap="4" mb="8" direction={align === "left" ? "row" : "row-reverse"}>
			<Box className={styles["feature-wrapper"]}>
				<Heading
					as="h2"
					size="9"
					style={{
						fontStyle: "italic",
					}}
					mb="6"
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
	);
};

export default Feature;
