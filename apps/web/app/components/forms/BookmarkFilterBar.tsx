import {
	Box,
	Button,
	Dialog,
	Flex,
	IconButton,
	Popover,
	ScrollArea,
	Text,
} from "@radix-ui/themes";
import type { tag as tagTable } from "@sill/schema";
import { ChevronDown, X } from "lucide-react";
import { type SyntheticEvent, useState } from "react";
import { Form, useSearchParams } from "react-router";
import { useIsMobile } from "~/hooks/useIsMobile";
import styles from "./PresetFilterItem.module.css";
import SearchField from "./SearchField";

interface BookmarkFilterBarProps {
	tags: (typeof tagTable.$inferSelect)[];
}

/**
 * The bookmarks filters, mirroring the feed's FilterBar: a Tags chip and an
 * inline search field. On desktop Tags is a compact popover of tag chips; on
 * mobile it's a full-screen panel. Search sits in the row on desktop and drops
 * to its own full-width row on mobile.
 */
const BookmarkFilterBar = ({ tags }: BookmarkFilterBarProps) => {
	const [searchParams, setSearchParams] = useSearchParams();
	const isMobile = useIsMobile();
	const [tagsOpen, setTagsOpen] = useState(false);

	const currentTag = searchParams.get("tag");

	const selectTag = (tagName: string | null) => {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			if (tagName) next.set("tag", tagName);
			else next.delete("tag");
			// A different filter set means paging restarts.
			next.delete("page");
			return next;
		});
		setTagsOpen(false);
	};

	const sortedTags = [...tags].sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
	);

	const chip = (active: boolean) =>
		`${styles.item} ${styles.chip} ${active ? styles.active : ""}`;
	const option = (active: boolean) =>
		`${styles.filterOption} ${active ? styles.active : ""}`;

	const clearTag = (e: SyntheticEvent) => {
		// Clear the tag without letting the click bubble up to the chip trigger
		// (which would open the popover instead).
		e.preventDefault();
		e.stopPropagation();
		selectTag(null);
	};

	const tagsTrigger = (
		<button
			type="button"
			className={chip(!!currentTag)}
			style={{ maxWidth: 200 }}
		>
			<Flex align="center" gap="2" style={{ minWidth: 0 }}>
				<Text truncate>{currentTag ?? "Tags"}</Text>
				{currentTag ? (
					// biome-ignore lint/a11y/useSemanticElements: a <button> can't be nested inside the chip trigger button
					<span
						role="button"
						tabIndex={0}
						aria-label="Clear tag"
						onClick={clearTag}
						onPointerDown={(e) => e.stopPropagation()}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") clearTag(e);
						}}
						style={{
							display: "inline-flex",
							flexShrink: 0,
							cursor: "pointer",
							opacity: 0.7,
						}}
					>
						<X width={14} height={14} />
					</span>
				) : (
					<ChevronDown
						width={14}
						height={14}
						style={{ opacity: 0.5, flexShrink: 0 }}
					/>
				)}
			</Flex>
		</button>
	);

	const tagOptions = (
		<Flex wrap="wrap" gap="1">
			<button
				type="button"
				className={option(!currentTag)}
				onClick={() => selectTag(null)}
			>
				All tags
			</button>
			{sortedTags.map((t) => (
				<button
					key={t.id}
					type="button"
					className={option(currentTag === t.name)}
					onClick={() => selectTag(t.name)}
				>
					{t.name}
				</button>
			))}
		</Flex>
	);

	return (
		<Box mb="5">
			<Flex gap="2" align="center">
				{tags.length > 0 &&
					(isMobile ? (
						<Dialog.Root open={tagsOpen} onOpenChange={setTagsOpen}>
							<Dialog.Trigger>{tagsTrigger}</Dialog.Trigger>
							<Dialog.Content maxWidth="440px">
								<Flex align="center" justify="between" mb="3">
									<Dialog.Title size="4" mb="0">
										Tags
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
									Filter bookmarks by tag
								</Dialog.Description>
								<ScrollArea
									type="auto"
									scrollbars="vertical"
									style={{ maxHeight: "50vh" }}
								>
									{tagOptions}
								</ScrollArea>
								<Dialog.Close>
									<Button size="3" mt="4" style={{ width: "100%" }}>
										Done
									</Button>
								</Dialog.Close>
							</Dialog.Content>
						</Dialog.Root>
					) : (
						<Popover.Root open={tagsOpen} onOpenChange={setTagsOpen}>
							<Popover.Trigger>{tagsTrigger}</Popover.Trigger>
							<Popover.Content width="340px" maxHeight="70vh">
								{tagOptions}
							</Popover.Content>
						</Popover.Root>
					))}

				{/* An inline search field fills the rest of the row at every width;
				    Tags is a compact chip, so both fit on one line on mobile too. */}
				<Box flexGrow="1" minWidth="0">
					<Form method="GET" onSubmit={(e) => e.preventDefault()}>
						<SearchField />
					</Form>
				</Box>
			</Flex>
		</Box>
	);
};

export default BookmarkFilterBar;
