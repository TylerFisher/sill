import {
	Box,
	Button,
	Dialog,
	Flex,
	IconButton,
	Spinner,
	Text,
} from "@radix-ui/themes";
import type {
	FilterPreset,
	SubscriptionStatus,
	list as listTable,
} from "@sill/schema";
import { Filter, X } from "lucide-react";
import { useState } from "react";
import { Form } from "react-router";
import { useLinkFilters } from "~/hooks/useLinkFilters";
import FilterPanel from "./FilterPanel";
import SearchField from "./SearchField";
import SortControl from "./SortControl";

interface FiltersDialogProps {
	showService: boolean;
	lists: (typeof listTable.$inferSelect)[];
	subscribed: SubscriptionStatus;
	presets: Pick<FilterPreset, "id" | "name" | "filters">[];
	// Discovery pages (author/domain) reuse the dialog but don't support search.
	hideSearch?: boolean;
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
	<Text
		as="p"
		size="1"
		color="gray"
		mb="2"
		style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
	>
		{children}
	</Text>
);

/**
 * The search + filter dialog, opened from a control in the top-right of the
 * mobile header. Search and the filter sliders/selects refine whichever feed is
 * selected in the FeedTabs strip. Self-contained (reads the URL via
 * useLinkFilters) so it can live in the header, away from the feed content.
 */
const FiltersDialog = ({
	showService,
	lists,
	subscribed,
	presets,
	hideSearch = false,
}: FiltersDialogProps) => {
	const [open, setOpen] = useState(false);
	const { sort, setSort, pendingGroup, refineCount, resetFilters, panelProps } =
		useLinkFilters({
			lists,
			subscribed,
			presets,
			showService,
			ownsRestore: false,
		});

	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
			<Dialog.Trigger>
				<IconButton
					variant="ghost"
					aria-label={
						refineCount > 0
							? `Search and filter, ${refineCount} active`
							: "Search and filter"
					}
					style={{ position: "relative" }}
				>
					{pendingGroup ? <Spinner size="2" /> : <Filter size={24} />}
					{/* How many filters/search are narrowing the feed, so the count is
					    legible before opening the dialog (not just a binary dot). */}
					{refineCount > 0 && (
						<Box
							aria-hidden
							style={{
								position: "absolute",
								top: -3,
								right: -5,
								minWidth: 16,
								height: 16,
								padding: "0 4px",
								borderRadius: "var(--radius-full)",
								background: "var(--accent-9)",
								// accent-9 (bright yellow) is the same in both themes, so the
								// number must always be dark. --accent-contrast is the token
								// Radix guarantees readable on the accent-9 solid fill; a raw
								// gray-12 flips to near-white in dark mode (the bug this fixes).
								color: "var(--accent-contrast)",
								fontSize: "10px",
								fontWeight: 700,
								lineHeight: "16px",
								textAlign: "center",
							}}
						>
							{refineCount}
						</Box>
					)}
				</IconButton>
			</Dialog.Trigger>
			<Dialog.Content maxWidth="440px">
				<Flex align="center" justify="between" mb="3">
					<Dialog.Title size="4" mb="0">
						{hideSearch ? "Filter" : "Search & filter"}
					</Dialog.Title>
					<Dialog.Close>
						<IconButton
							variant="ghost"
							color="gray"
							size="2"
							aria-label="Close"
						>
							<X size={20} />
						</IconButton>
					</Dialog.Close>
				</Flex>
				<Dialog.Description
					style={{
						position: "absolute",
						width: 1,
						height: 1,
						overflow: "hidden",
						clip: "rect(0 0 0 0)",
					}}
				>
					Search and filter the current feed
				</Dialog.Description>

				<Flex direction="column" gap="4">
					<SortControl
						sort={sort}
						setSort={setSort}
						pending={pendingGroup === "sort"}
					/>
					{!hideSearch && (
						<Box>
							<SectionLabel>Search</SectionLabel>
							<Form method="GET" onSubmit={(e) => e.preventDefault()}>
								<SearchField hideSubmitButton />
							</Form>
						</Box>
					)}
					<Box>
						<FilterPanel {...panelProps} />
					</Box>
				</Flex>

				<Box mt="4">
					{refineCount > 0 && (
						<Flex justify="end" mb="3">
							<Button
								size="2"
								variant="ghost"
								color="gray"
								onClick={resetFilters}
							>
								Reset
							</Button>
						</Flex>
					)}
					<Dialog.Close>
						<Button size="3" style={{ width: "100%" }}>
							Done
						</Button>
					</Dialog.Close>
				</Box>
			</Dialog.Content>
		</Dialog.Root>
	);
};

export default FiltersDialog;
