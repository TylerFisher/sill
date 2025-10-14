import {
	Button,
	Callout,
	Dialog,
	Flex,
	IconButton,
	Spinner,
	Switch,
	Text,
	TextField,
} from "@radix-ui/themes";
import { Bookmark } from "lucide-react";
import { useState } from "react";
import { useFetcher } from "react-router";

const BookmarkLink = ({
	url,
	isBookmarked,
	hasBlueskyAccount = false,
}: { url: string; isBookmarked: boolean; hasBlueskyAccount?: boolean }) => {
	const fetcher = useFetcher();
	const [open, setOpen] = useState(false);
	const [tags, setTags] = useState("");
	const [error, setError] = useState("");
	const [publishToAtproto, setPublishToAtproto] = useState(false);

	const handleIconClick = () => {
		if (isBookmarked) {
			fetcher.submit(
				{ url },
				{ method: "DELETE", action: "/bookmarks/delete" },
			);
		} else {
			setOpen(true);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		// Validate tag lengths (max 30 characters each)
		if (tags.trim()) {
			const tagList = tags
				.split(",")
				.map((t) => t.trim())
				.filter((t) => t.length > 0);
			const invalidTags = tagList.filter((t) => t.length > 30);

			if (invalidTags.length > 0) {
				setError(
					`Tags must be 30 characters or less: ${invalidTags.join(", ")}`,
				);
				return;
			}
		}

		setError("");
		const formData = new FormData(e.target as HTMLFormElement);
		fetcher.submit(formData, { method: "POST", action: "/bookmarks/add" });
		setOpen(false);
		setTags("");
		setPublishToAtproto(false);
	};

	return (
		<>
			<IconButton
				variant="ghost"
				size="1"
				aria-label="Bookmark"
				color="gray"
				onClick={handleIconClick}
				disabled={fetcher.state === "submitting" || fetcher.state === "loading"}
			>
				{fetcher.state === "submitting" || fetcher.state === "loading" ? (
					<Spinner />
				) : (
					<Bookmark
						fill={isBookmarked ? "currentColor" : "none"}
						width="18"
						height="18"
					/>
				)}
			</IconButton>

			<Dialog.Root open={open} onOpenChange={setOpen}>
				<Dialog.Content maxWidth="450px">
					<Dialog.Title>Add Bookmark</Dialog.Title>
					<Dialog.Description size="2" mb="4">
						Add tags to organize this bookmark (optional, comma-separated)
					</Dialog.Description>

					<form onSubmit={handleSubmit}>
						<input type="hidden" name="url" value={url} />
						<input
							type="hidden"
							name="publishToAtproto"
							value={publishToAtproto ? "true" : "false"}
						/>

						<Flex direction="column" gap="3">
							{error && (
								<Callout.Root color="red" size="1">
									<Callout.Text>{error}</Callout.Text>
								</Callout.Root>
							)}

							<TextField.Root
								name="tags"
								placeholder="e.g. tech, javascript, tutorial"
								value={tags}
								onChange={(e) => setTags(e.target.value)}
							/>

							{hasBlueskyAccount && (
								<Text as="label" size="2">
									<Flex gap="2" align="center">
										<Switch
											size="1"
											checked={publishToAtproto}
											onCheckedChange={setPublishToAtproto}
										/>
										Publish to PDS
									</Flex>
								</Text>
							)}

							<Flex gap="3" mt="4" justify="end">
								<Dialog.Close>
									<Button variant="soft" color="gray" type="button">
										Cancel
									</Button>
								</Dialog.Close>
								<Button type="submit">Add Bookmark</Button>
							</Flex>
						</Flex>
					</form>
				</Dialog.Content>
			</Dialog.Root>
		</>
	);
};

export default BookmarkLink;
