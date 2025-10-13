import { Box } from "@radix-ui/themes";

interface FilterCustomIndicatorProps {
	isVisible: boolean;
}

const FilterCustomIndicator = ({ isVisible }: FilterCustomIndicatorProps) => {
	if (!isVisible) return null;

	return (
		<Box
			style={{
				width: "6px",
				height: "6px",
				borderRadius: "50%",
				backgroundColor: "var(--accent-11)",
				flexShrink: 0,
			}}
		/>
	);
};

export default FilterCustomIndicator;
