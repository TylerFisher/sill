import { Text } from "@radix-ui/themes";

const LinkDescription = ({
	description,
	layout,
}: { description: string; layout: "default" | "dense" }) => {
	return (
		<Text
			as="p"
			size={{
				initial: layout === "dense" ? "2" : "2",
				sm: layout === "dense" ? "2" : "2",
			}}
			mt={layout === "dense" ? "1" : "1"}
			mb={layout === "dense" ? "2" : "3"}
			color="gray"
		>
			{description}
		</Text>
	);
};

export default LinkDescription;
