import { IconButton, Spinner } from "@radix-ui/themes";
import { Bookmark } from "lucide-react";
import { useFetcher } from "react-router";

const BookmarkLink = ({
	url,
	isBookmarked,
}: { url: string; isBookmarked: boolean }) => {
	const fetcher = useFetcher();

	return (
		<fetcher.Form
			method={isBookmarked ? "DELETE" : "POST"}
			action={isBookmarked ? "/bookmarks/delete" : "/bookmarks/add"}
		>
			<input type="hidden" name="url" value={url} />
			<IconButton variant="ghost" size="1" aria-label="Bookmark">
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
		</fetcher.Form>
	);
};

export default BookmarkLink;
