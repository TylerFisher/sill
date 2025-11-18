import {
	Box,
	Button,
	Callout,
	Dialog,
	Flex,
	Switch,
	Text,
	TextField,
} from "@radix-ui/themes";
import { useState } from "react";
import { useFetcher } from "react-router";

interface AddBookmarkDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	hasBlueskyAccount?: boolean;
	initialUrl?: string;
}

const AddBookmarkDialog = ({
	open,
	onOpenChange,
	hasBlueskyAccount = false,
	initialUrl = "",
}: AddBookmarkDialogProps) => {
	const fetcher = useFetcher();
	const [url, setUrl] = useState(initialUrl);
	const [tags, setTags] = useState("");
	const [error, setError] = useState("");
	const [publishToAtproto, setPublishToAtproto] = useState(false);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!url.trim()) {
			setError("URL is required");
			return;
		}

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
		onOpenChange(false);
		setUrl("");
		setTags("");
		setPublishToAtproto(false);
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Content maxWidth="450px">
				<Dialog.Title>Add Bookmark</Dialog.Title>
				<Dialog.Description size="2" mb="4">
					Add a URL to bookmark and organize with tags (optional)
				</Dialog.Description>

				<form onSubmit={handleSubmit}>
					<input type="hidden" name="url" value={url} />
					<input type="hidden" name="tags" value={tags} />
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

						<Box>
							<Text as="label" size="2" weight="medium" mb="1">
								URL
							</Text>
							<TextField.Root
								placeholder="https://example.com/article"
								value={url}
								onChange={(e) => setUrl(e.target.value)}
								required
							/>
						</Box>

						<Box>
							<Text as="label" size="2" weight="medium" mb="1">
								Tags (optional)
							</Text>
							<TextField.Root
								placeholder="e.g. tech, javascript, tutorial"
								value={tags}
								onChange={(e) => setTags(e.target.value)}
							/>
						</Box>

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
	);
};

export default AddBookmarkDialog;
