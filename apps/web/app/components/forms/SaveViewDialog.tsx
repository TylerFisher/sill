import { Button, Dialog, Flex, Spinner, Text, TextField } from "@radix-ui/themes";
import type { FilterPreset } from "@sill/schema";
import { useEffect, useRef, useState } from "react";
import { useFetcher, useSearchParams } from "react-router";
import { configFromParams, summarizeConfig } from "~/utils/filterPresets";

interface SaveViewDialogProps {
	lists: { id: string; name: string }[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * The "Save current state as a view" dialog. Rendered at the top level (not
 * inside the mobile Filters dialog) so it isn't unmounted when that dialog
 * closes on the way to opening this one.
 */
const SaveViewDialog = ({ lists, open, onOpenChange }: SaveViewDialogProps) => {
	const [searchParams] = useSearchParams();
	// Shares a fetcher key with SavedViewsMenu so the saved view lands in that
	// menu's list the moment the create resolves.
	const mutation = useFetcher<{
		presets?: Pick<FilterPreset, "id" | "name" | "filters">[];
		error?: string;
	}>({ key: "filter-presets" });
	const [name, setName] = useState("");

	// A descriptive default name from the current state (e.g. "Newest, 5+ shares").
	const suggestedName = summarizeConfig(configFromParams(searchParams), lists)
		.split(" · ")
		.join(", ")
		.slice(0, 60);

	// Prefill the name when the dialog opens; user edits are respected afterward.
	useEffect(() => {
		if (open) setName((n) => n || suggestedName);
	}, [open, suggestedName]);

	// Close once a create succeeds (no error came back).
	const submitting = mutation.state !== "idle";
	const prevSubmitting = useRef(submitting);
	useEffect(() => {
		if (prevSubmitting.current && !submitting && !mutation.data?.error) {
			onOpenChange(false);
			setName("");
		}
		prevSubmitting.current = submitting;
	}, [submitting, mutation.data, onOpenChange]);

	const savePreset = () => {
		const trimmed = name.trim();
		if (!trimmed) return;
		mutation.submit(
			{
				intent: "create",
				name: trimmed,
				filters: JSON.stringify(configFromParams(searchParams)),
			},
			{ method: "post", action: "/api/filter-presets" },
		);
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Content maxWidth="360px">
				<Dialog.Title size="3">Save view</Dialog.Title>
				<Dialog.Description size="2" color="gray" mb="3">
					Name this view so you can reapply it in one tap. We've suggested a name
					from your current filters.
				</Dialog.Description>
				<TextField.Root
					value={name}
					maxLength={60}
					placeholder="Name this view"
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							savePreset();
						}
					}}
				/>
				{mutation.data?.error && (
					<Text as="p" size="1" color="red" mt="2">
						{mutation.data.error}
					</Text>
				)}
				<Flex justify="end" gap="2" mt="4">
					<Dialog.Close>
						<Button variant="soft" color="gray">
							Cancel
						</Button>
					</Dialog.Close>
					<Button onClick={savePreset} disabled={submitting || !name.trim()}>
						{submitting ? <Spinner size="1" /> : "Save"}
					</Button>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
};

export default SaveViewDialog;
