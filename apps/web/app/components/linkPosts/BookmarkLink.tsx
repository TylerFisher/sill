import { IconButton, Spinner } from "@radix-ui/themes";
import { Bookmark } from "lucide-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import AddBookmarkDialog from "~/components/forms/AddBookmarkDialog";

const BookmarkLink = ({
	url,
	isBookmarked,
	hasBlueskyAccount = false,
}: { url: string; isBookmarked: boolean; hasBlueskyAccount?: boolean }) => {
	const fetcher = useFetcher();
	const [open, setOpen] = useState(false);

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

	return (
		<>
			<IconButton
				variant="ghost"
				size="1"
				aria-label="Bookmark"
				color={isBookmarked ? "yellow" : "gray"}
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

			<AddBookmarkDialog
				open={open}
				onOpenChange={setOpen}
				hasBlueskyAccount={hasBlueskyAccount}
				initialUrl={url}
			/>
		</>
	);
};

export default BookmarkLink;
