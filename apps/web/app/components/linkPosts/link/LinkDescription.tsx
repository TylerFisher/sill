import { Text } from "@radix-ui/themes";

const truncateDescription = (text: string, maxLength = 300): string => {
	if (text.length <= maxLength) return text;
	const sentenceEnd = text.slice(maxLength).search(/[.!?]/);
	if (sentenceEnd !== -1) {
		return text.slice(0, maxLength + sentenceEnd + 1);
	}
	return text;
};

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
		>
			{truncateDescription(description)}
		</Text>
	);
};

export default LinkDescription;
