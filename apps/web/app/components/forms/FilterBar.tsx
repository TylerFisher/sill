import { Box } from "@radix-ui/themes";
import type {
	FilterPreset,
	SubscriptionStatus,
	list as listTable,
} from "@sill/schema";
import { useState } from "react";
import { useLinkFilters } from "~/hooks/useLinkFilters";
import FeedTabs from "./FeedTabs";
import ManageFeedsDialog from "./ManageFeedsDialog";
import SaveViewDialog from "./SaveViewDialog";

interface FilterBarProps {
	showService: boolean;
	lists: (typeof listTable.$inferSelect)[];
	subscribed: SubscriptionStatus;
	presets: Pick<FilterPreset, "id" | "name" | "filters">[];
}

/**
 * The feed switcher at the top of the center column: a horizontally scrolling
 * strip of feeds (built-in sorts + saved views). Search and filters live in the
 * sidebar (desktop) or the header's FiltersDialog (mobile).
 */
const FilterBar = ({
	showService,
	lists,
	subscribed,
	presets,
}: FilterBarProps) => {
	const { isPlus, canSave, saveOpen, setSaveOpen } = useLinkFilters({
		lists,
		subscribed,
		presets,
		showService,
		ownsRestore: true,
	});
	const [manageOpen, setManageOpen] = useState(false);

	return (
		<Box mb="3">
			<FeedTabs
				presets={presets}
				isPlus={isPlus}
				canSave={canSave}
				onSave={() => setSaveOpen(true)}
				onManage={() => setManageOpen(true)}
			/>
			<SaveViewDialog
				lists={lists}
				open={saveOpen}
				onOpenChange={setSaveOpen}
			/>
			<ManageFeedsDialog
				presets={presets}
				lists={lists}
				open={manageOpen}
				onOpenChange={setManageOpen}
			/>
		</Box>
	);
};

export default FilterBar;
