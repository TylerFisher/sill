import { Box, Flex, SegmentedControl, Spinner, Text } from "@radix-ui/themes";

interface SortControlProps {
	// "" = most popular (the default, an absent param); "newest" = chronological.
	sort: string;
	setSort: (value: string) => void;
	pending: boolean;
}

/**
 * Re-orders the current feed without disturbing its filters or search. This is
 * the non-wiping counterpart to the built-in FeedTabs sort tabs: those are clean
 * feeds, this tunes ordering in place. Kept visually neutral on purpose — the
 * selected segment is a plain raised pill, not the accent, so the one amber
 * "you are here" stays with the active feed tab (the One Voice rule).
 */
const SortControl = ({ sort, setSort, pending }: SortControlProps) => (
	<Box>
		<Flex justify="between" align="center" mb="2">
			<Text
				as="span"
				size="1"
				color="gray"
				style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
			>
				Sort
			</Text>
			{pending && <Spinner size="1" />}
		</Flex>
		<SegmentedControl.Root
			value={sort === "newest" ? "newest" : "popular"}
			onValueChange={(v) => setSort(v === "newest" ? "newest" : "")}
			size="2"
			radius="full"
			style={{ width: "100%" }}
		>
			<SegmentedControl.Item value="popular">Popular</SegmentedControl.Item>
			<SegmentedControl.Item value="newest">Newest</SegmentedControl.Item>
		</SegmentedControl.Root>
	</Box>
);

export default SortControl;
