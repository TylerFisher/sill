import { Box, Grid, Heading, Text } from "@radix-ui/themes";
import { Brain, Clock, Newspaper } from "lucide-react";
import styles from "./WhySill.module.css";

const benefits = [
	{
		icon: <Clock />,
		title: "Save Time",
		description:
			"Stop endlessly scrolling. Sill watches your timeline and surfaces what matters most.",
	},
	{
		icon: <Newspaper />,
		title: "Personalized News",
		description:
			"Get a curated feed of links shared by people you actually trust, not algorithmic recommendations.",
	},
	{
		icon: <Brain />,
		title: "Stop doomscrolling",
		description:
			"Stay informed without getting addicted. Focus on meaningful content, not endless feeds.",
	},
];

const WhySill = () => {
	return (
		<Box className={styles.whySill}>
			<Heading size="8" align="center" mb="6">
				Why Choose Sill?
			</Heading>

			<Grid columns={{ initial: "1", sm: "3" }} gap="6">
				{benefits.map((benefit) => (
					<Box key={benefit.title} className={styles.benefit}>
						<Box className={styles.iconWrapper}>{benefit.icon}</Box>
						<Heading size="4" mb="2">
							{benefit.title}
						</Heading>
						<Text size="3" color="gray">
							{benefit.description}
						</Text>
					</Box>
				))}
			</Grid>
		</Box>
	);
};

export default WhySill;
