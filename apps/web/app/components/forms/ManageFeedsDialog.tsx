import {
	Box,
	Button,
	Dialog,
	Flex,
	IconButton,
	Separator,
	Spinner,
	Text,
	TextField,
} from "@radix-ui/themes";
import type { FilterPreset } from "@sill/schema";
import { X } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useState } from "react";
import { useFetcher, useSearchParams } from "react-router";
import {
	BUILT_IN_FEEDS,
	type PresetConfig,
	configFromParams,
	isActivePreset,
	summarizeConfig,
} from "~/utils/filterPresets";

type PresetTab = Pick<FilterPreset, "id" | "name" | "filters">;

interface ManageFeedsDialogProps {
	presets: PresetTab[];
	lists: { id: string; name: string }[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

type FeedAction = "rename" | "update" | "delete";
type Pending = { id: string; action: FeedAction };
type RowError = { id: string; action: FeedAction; message: string };

/**
 * The feed manager: a deliberate surface for the rare, careful actions the
 * switcher strip shouldn't carry inline (rename, repoint at the current filters,
 * delete). Big rows and real tap targets, unlike the strip's tiny inline ✕.
 *
 * Rename and delete confirm INLINE (the row swaps to a field or a question) so
 * this sheet never stacks a second modal on itself. Every action runs through
 * the shared "filter-presets" fetcher so the strip and save dialog stay in sync,
 * and one central effect resolves whichever action fired (surfacing its error in
 * the right row, clearing the inline mode on success).
 */
const ManageFeedsDialog = ({
	presets,
	lists,
	open,
	onOpenChange,
}: ManageFeedsDialogProps) => {
	const [searchParams] = useSearchParams();
	const mutation = useFetcher<{
		presets?: PresetTab[];
		error?: string;
		intent?: string;
	}>({ key: "filter-presets" });
	const feeds = mutation.data?.presets ?? presets;

	// The current view, captured the same way a save captures it, so "Update to
	// current" repoints a feed at exactly what the user is looking at.
	const currentConfig = configFromParams(searchParams);
	// "Update to current" only makes sense when the current view is a genuine
	// custom (unsaved) refinement, matching no feed. Parked on an existing feed,
	// updating a *different* feed to it would just clone that feed — pointless.
	const currentIsCustom =
		!BUILT_IN_FEEDS.some((f) => isActivePreset(f.filters, searchParams)) &&
		!feeds.some((f) => isActivePreset(f.filters as PresetConfig, searchParams));

	const [pending, setPending] = useState<Pending | null>(null);
	const [rowError, setRowError] = useState<RowError | null>(null);
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [renameDraft, setRenameDraft] = useState("");
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const submitting = mutation.state !== "idle";

	// Resolve whichever action this dialog last fired: surface its error in place,
	// or clear the inline mode on success.
	useEffect(() => {
		if (!pending || submitting) return;
		const expectIntent = pending.action === "delete" ? "delete" : "update";
		const message =
			mutation.data?.intent === expectIntent ? mutation.data.error : undefined;
		if (message) {
			setRowError({ id: pending.id, action: pending.action, message });
		} else {
			setRowError(null);
			if (pending.action === "rename") setRenamingId(null);
			if (pending.action === "delete") setDeletingId(null);
		}
		setPending(null);
	}, [pending, submitting, mutation.data]);

	const fire = (p: Pending, body: Record<string, string>) => {
		setRowError(null);
		setPending(p);
		mutation.submit(body, { method: "post", action: "/api/filter-presets" });
	};

	const doRename = (id: string) => {
		const name = renameDraft.trim();
		if (!name) return;
		fire({ id, action: "rename" }, { intent: "update", id, name });
	};

	const doUpdate = (id: string) =>
		fire(
			{ id, action: "update" },
			{ intent: "update", id, filters: JSON.stringify(currentConfig) },
		);

	const doDelete = (id: string) =>
		fire({ id, action: "delete" }, { intent: "delete", id });

	const startRename = (preset: PresetTab) => {
		setRowError(null);
		setDeletingId(null);
		setRenameDraft(preset.name);
		setRenamingId(preset.id);
	};

	const ellipsis = {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	} as const;

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Content maxWidth="440px">
				<Flex align="center" justify="between" mb="4">
					<Dialog.Title size="4" mb="0">
						Manage feeds
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
					Rename, re-point, or delete your saved feeds.
				</Dialog.Description>

				{feeds.length === 0 ? (
					<Text as="p" size="2" color="gray">
						You haven't saved any feeds yet.
					</Text>
				) : (
					<Flex direction="column" gap="4">
						{feeds.map((preset, i) => {
							const rowErr = rowError?.id === preset.id ? rowError : null;
							let content: ReactNode;

							if (renamingId === preset.id) {
								// Rename inline: the row becomes a field, no second modal.
								content = (
									<>
										<Flex gap="2" align="center">
											<TextField.Root
												value={renameDraft}
												maxLength={60}
												placeholder="Feed name"
												aria-label={`Rename ${preset.name}`}
												style={{ flexGrow: 1 }}
												autoFocus
												onChange={(e) => setRenameDraft(e.target.value)}
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														e.preventDefault();
														doRename(preset.id);
													}
													if (e.key === "Escape") setRenamingId(null);
												}}
											/>
											<Button
												variant="soft"
												color="gray"
												onClick={() => setRenamingId(null)}
											>
												Cancel
											</Button>
											<Button
												onClick={() => doRename(preset.id)}
												disabled={submitting || !renameDraft.trim()}
											>
												{pending?.action === "rename" ? (
													<Spinner size="1" />
												) : (
													"Save"
												)}
											</Button>
										</Flex>
										{rowErr?.action === "rename" && (
											<Text as="p" size="1" color="red" mt="1">
												{rowErr.message}
											</Text>
										)}
									</>
								);
							} else if (deletingId === preset.id) {
								// Delete confirms inline too: the actions swap for a question.
								content = (
									<>
										<Text as="p" size="2" weight="medium">
											Delete “{preset.name}”?
										</Text>
										<Text as="p" size="1" color="gray" mt="1">
											You can save it again later.
										</Text>
										<Flex gap="2" align="center" mt="3">
											<Button
												size="2"
												color="red"
												disabled={submitting}
												onClick={() => doDelete(preset.id)}
											>
												{pending?.action === "delete" ? (
													<Spinner size="1" />
												) : (
													"Delete"
												)}
											</Button>
											<Button
												size="2"
												variant="soft"
												color="gray"
												onClick={() => setDeletingId(null)}
											>
												Keep
											</Button>
										</Flex>
										{rowErr?.action === "delete" && (
											<Text as="p" size="1" color="red" mt="1">
												{rowErr.message} Please try again.
											</Text>
										)}
									</>
								);
							} else {
								const summary = summarizeConfig(
									preset.filters as PresetConfig,
									lists,
								);
								const updating =
									pending?.id === preset.id && pending.action === "update";
								// Only when the current view is an unsaved custom refinement
								// (currentIsCustom already implies this feed isn't the active one).
								const canUpdate = currentIsCustom;

								content = (
									<>
										<Text as="p" size="3" weight="medium" style={ellipsis}>
											{preset.name}
										</Text>
										{summary && (
											<Text
												as="p"
												size="1"
												color="gray"
												mt="1"
												style={ellipsis}
											>
												{summary}
											</Text>
										)}
										<Flex gap="2" align="center" wrap="wrap" mt="3">
											<Button
												size="2"
												variant="soft"
												color="gray"
												disabled={!!pending}
												onClick={() => startRename(preset)}
											>
												Rename
											</Button>
											{canUpdate && (
												<Button
													size="2"
													variant="soft"
													color="gray"
													disabled={!!pending}
													onClick={() => doUpdate(preset.id)}
												>
													{updating ? (
														<Spinner size="1" />
													) : (
														"Update to current"
													)}
												</Button>
											)}
											<Button
												size="2"
												color="red"
												disabled={!!pending}
												onClick={() => {
													setRowError(null);
													setRenamingId(null);
													setDeletingId(preset.id);
												}}
											>
												Delete
											</Button>
										</Flex>
										{rowErr?.action === "update" && (
											<Text as="p" size="1" color="red" mt="1">
												{rowErr.message} Please try again.
											</Text>
										)}
									</>
								);
							}

							return (
								<Fragment key={preset.id}>
									{i > 0 && <Separator size="4" />}
									<Box>{content}</Box>
								</Fragment>
							);
						})}
					</Flex>
				)}
			</Dialog.Content>
		</Dialog.Root>
	);
};

export default ManageFeedsDialog;
