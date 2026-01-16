import { Box, Button, Callout, Flex, Switch, Text, TextField } from "@radix-ui/themes";
import { useState } from "react";

interface BookmarkFormProps {
	url: string;
	onUrlChange?: (url: string) => void;
	hasBlueskyAccount?: boolean;
	error?: string;
	onCancel: () => void;
	cancelLabel?: string;
	submitLabel?: string;
	readOnlyUrl?: boolean;
	formProps?: React.ComponentProps<"form">;
}

export default function BookmarkForm({
	url,
	onUrlChange,
	hasBlueskyAccount = false,
	error,
	onCancel,
	cancelLabel = "Cancel",
	submitLabel = "Save Bookmark",
	readOnlyUrl = false,
	formProps,
}: BookmarkFormProps) {
	const [tags, setTags] = useState("");
	const [publishToAtproto, setPublishToAtproto] = useState(false);
	const [localError, setLocalError] = useState("");

	const displayError = error || localError;

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		// Validate tag lengths before submitting
		if (tags.trim()) {
			const tagList = tags
				.split(",")
				.map((t) => t.trim())
				.filter((t) => t.length > 0);
			const invalidTags = tagList.filter((t) => t.length > 30);

			if (invalidTags.length > 0) {
				e.preventDefault();
				setLocalError(
					`Tags must be 30 characters or less: ${invalidTags.join(", ")}`,
				);
				return;
			}
		}

		if (!url.trim()) {
			e.preventDefault();
			setLocalError("URL is required");
			return;
		}

		setLocalError("");
		// Let the form submit naturally or call formProps.onSubmit
		formProps?.onSubmit?.(e);
	};

	const truncatedUrl = url.length > 60 ? `${url.slice(0, 60)}...` : url;

	return (
		<form {...formProps} onSubmit={handleSubmit}>
			<input type="hidden" name="url" value={url} />
			<input type="hidden" name="tags" value={tags} />
			<input
				type="hidden"
				name="publishToAtproto"
				value={publishToAtproto ? "true" : "false"}
			/>

			<Flex direction="column" gap="3">
				{displayError && (
					<Callout.Root color="red" size="1">
						<Callout.Text>{displayError}</Callout.Text>
					</Callout.Root>
				)}

				<Box>
					<Text as="label" size="2" weight="medium" mb="1">
						URL
					</Text>
					{readOnlyUrl ? (
						<Text
							as="p"
							size="2"
							color="gray"
							title={url}
							style={{
								wordBreak: "break-all",
								padding: "var(--space-2)",
								backgroundColor: "var(--gray-a3)",
								borderRadius: "var(--radius-2)",
							}}
						>
							{truncatedUrl}
						</Text>
					) : (
						<TextField.Root
							placeholder="https://example.com/article"
							value={url}
							onChange={(e) => onUrlChange?.(e.target.value)}
							required
						/>
					)}
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
					<Text as="p" size="1" color="gray" mt="1">
						Separate tags with commas
					</Text>
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

				<Flex gap="3" mt="3" justify="end">
					<Button
						variant="soft"
						color="gray"
						type="button"
						onClick={onCancel}
						style={{ cursor: "pointer" }}
					>
						{cancelLabel}
					</Button>
					<Button type="submit" style={{ cursor: "pointer" }}>
						{submitLabel}
					</Button>
				</Flex>
			</Flex>
		</form>
	);
}
