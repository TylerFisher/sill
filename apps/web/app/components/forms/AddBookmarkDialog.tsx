import { Dialog } from "@radix-ui/themes";
import { useState } from "react";
import { useFetcher } from "react-router";
import BookmarkForm from "./BookmarkForm";

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    fetcher.submit(formData, { method: "POST", action: "/bookmarks/add" });
    onOpenChange(false);
    setUrl("");
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Add Bookmark</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Add a URL to bookmark and organize with tags (optional)
        </Dialog.Description>

        <BookmarkForm
          url={url}
          onUrlChange={setUrl}
          hasBlueskyAccount={hasBlueskyAccount}
          onCancel={() => onOpenChange(false)}
          submitLabel="Add Bookmark"
          formProps={{ onSubmit: handleSubmit }}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default AddBookmarkDialog;
