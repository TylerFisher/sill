import { Box, Button, Flex, Heading, Text } from "@radix-ui/themes";
import { redirect, useActionData } from "react-router";
import BookmarkForm from "~/components/forms/BookmarkForm";
import { apiAddBookmark } from "~/utils/api-client.server";
import {
  getUserFromContext,
  requireUserFromContext,
} from "~/utils/context.server";
import type { Route } from "./+types/popup";
import styles from "./popup.module.css";

export const meta: Route.MetaFunction = () => [
  { title: "Sill | Add Bookmark" },
];

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  // Check url param first, fall back to text param (some Android apps share URLs there)
  const bookmarkUrl =
    url.searchParams.get("url") || url.searchParams.get("text") || "";

  // Validate URL to prevent javascript:, data:, or other malicious URLs
  if (
    bookmarkUrl &&
    !bookmarkUrl.startsWith("http://") &&
    !bookmarkUrl.startsWith("https://")
  ) {
    throw redirect("/bookmarks");
  }

  const user = await getUserFromContext(context);

  if (!user) {
    const redirectTo = `/bookmarks/popup?url=${encodeURIComponent(
      bookmarkUrl
    )}`;
    const loginParams = new URLSearchParams({ redirectTo });
    throw redirect(`/accounts/login?${loginParams.toString()}`);
  }

  const hasBlueskyAccount = user.blueskyAccounts.length > 0;

  return { bookmarkUrl, hasBlueskyAccount };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { id: userId } = await requireUserFromContext(context);

  if (!userId) {
    return { success: false, error: "Not authenticated" };
  }

  const formData = await request.formData();
  const url = String(formData.get("url"));
  const tags = formData.get("tags") ? String(formData.get("tags")) : undefined;
  const publishToAtproto = formData.get("publishToAtproto") === "true";

  if (!url) {
    return { success: false, error: "URL is required" };
  }

  // Validate tag lengths
  if (tags) {
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const invalidTags = tagList.filter((t) => t.length > 30);

    if (invalidTags.length > 0) {
      return {
        success: false,
        error: `Tags must be 30 characters or less: ${invalidTags.join(", ")}`,
      };
    }
  }

  try {
    const response = await apiAddBookmark(request, {
      url,
      tags,
      publishToAtproto,
    });

    if (!response.ok) {
      const errorData = await response.json();
      if ("error" in errorData) {
        return { success: false, error: errorData.error };
      }
      return { success: false, error: "Failed to add bookmark" };
    }

    return { success: true };
  } catch (error) {
    console.error("Add bookmark error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add bookmark",
    };
  }
}

export default function BookmarkPopup({ loaderData }: Route.ComponentProps) {
  const { bookmarkUrl, hasBlueskyAccount } = loaderData;
  const actionData = useActionData<typeof action>();

  const truncatedUrl =
    bookmarkUrl.length > 60 ? `${bookmarkUrl.slice(0, 60)}...` : bookmarkUrl;

  if (actionData?.success) {
    return (
      <Box className={styles.container}>
        <Flex direction="column" gap="4" align="center" justify="center" py="6">
          <Heading as="h2" size="5">
            Bookmark saved
          </Heading>
          <Text size="2" color="gray">
            {truncatedUrl}
          </Text>
          <Button onClick={() => window.close()} style={{ cursor: "pointer" }}>
            Close window
          </Button>
        </Flex>
      </Box>
    );
  }

  return (
    <Box className={styles.container}>
      <Heading as="h2" size="5" mb="4">
        Add Bookmark
      </Heading>

      <BookmarkForm
        url={bookmarkUrl}
        hasBlueskyAccount={hasBlueskyAccount}
        error={actionData?.error}
        onCancel={() => window.close()}
        readOnlyUrl
        formProps={{ method: "post" }}
      />
    </Box>
  );
}
