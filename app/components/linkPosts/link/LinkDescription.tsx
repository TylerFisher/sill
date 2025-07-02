import { Text } from "@radix-ui/themes";

const LinkDescription = ({
	description,
	layout,
}: { description: string; layout: "default" | "dense" }) => {
	return (
		<Text
			as="p"
			size="2"
			mt={layout === "dense" ? "2" : "3"}
			mb={layout === "dense" ? "2" : "3"}
			color="gray"
		>
			{description}
		</Text>
	);
};

export default LinkDescription;
