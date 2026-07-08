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
	const { pendingGroup, savable, resetFilters, panelProps } = useLinkFilters({
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
					aria-label="Search and filter"
					style={{ position: "relative" }}
				>
					{pendingGroup ? <Spinner size="2" /> : <Filter size={24} />}
					{/* A dot marks an active search or filter. */}
					{savable && (
						<Box
							style={{
								position: "absolute",
								top: 4,
								right: 4,
								width: 8,
								height: 8,
								borderRadius: "50%",
								background: "var(--accent-9)",
							}}
						/>
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
					{!hideSearch && (
						<Box>
							<SectionLabel>Search</SectionLabel>
							<Form method="GET" onSubmit={(e) => e.preventDefault()}>
								<SearchField rounded hideSubmitButton />
							</Form>
						</Box>
					)}
					<Box>
						<FilterPanel {...panelProps} />
					</Box>
				</Flex>

				<Box mt="4">
					{savable && (
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
