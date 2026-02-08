import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  IconButton,
  Link,
  Separator,
  Text,
} from "@radix-ui/themes";
import { Bookmark } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { redirect, useFetcher, useSearchParams } from "react-router";
import { debounce } from "ts-debounce";
import { uuidv7 } from "uuidv7-js";
import AddBookmarkDialog from "~/components/forms/AddBookmarkDialog";
import BookmarkFilters from "~/components/forms/BookmarkFilters";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import BookmarkletSetup from "~/components/settings/BookmarkletSetup";
import { LinkPost } from "~/routes/links";
import {
  apiGetBookmarkTags,
  apiListBookmarks,
} from "~/utils/api-client.server";
import { useLayout } from "../resources/layout-switch";
import type { Route } from "./+types";
import { invariantResponse } from "@epic-web/invariant";
import { requireUserFromContext } from "~/utils/context.server";
import type { MostRecentLinkPosts, tag } from "@sill/schema";
import LinkFiltersCollapsible from "~/components/forms/LinkFiltersCollapsible";
export const meta: Route.MetaFunction = () => [{ title: "Sill | Bookmarks" }];

type TagData = {
  tag: typeof tag.$inferSelect;
};

export type BookmarkWithLinkPosts = {
  id: string;
  posts: MostRecentLinkPosts;
  userId: string;
  linkUrl: string;
  createdAt: string;
  linkPosts?: MostRecentLinkPosts;
  bookmarkTags?: TagData[];
  atprotoRkey: string | null;
  published: boolean;
};

export async function loader({ request, context }: Route.LoaderArgs) {
  const existingUser = await requireUserFromContext(context);
  invariantResponse(existingUser, "User not found", { status: 404 });
  const subscribed = existingUser.subscriptionStatus;

  if (subscribed === "free") {
    return redirect("/settings/subscription");
  }

  const bsky = existingUser.blueskyAccounts[0] || null;
  const mastodon = existingUser.mastodonAccounts[0] || null;

  const url = new URL(request.url);
  const query = url.searchParams.get("query") || undefined;
  const tag = url.searchParams.get("tag") || undefined;
  const page = url.searchParams.get("page") || "1";

  const bookmarkData = await apiListBookmarks(request, {
    query,
    tag,
    page: Number.parseInt(page),
    limit: 10,
  });

  const tagsData = await apiGetBookmarkTags(request);

  return {
    bookmarks: bookmarkData.bookmarks,
    tags: tagsData.tags,
    subscribed,
    bsky: bsky?.handle,
    instance: mastodon?.mastodonInstance.instance,
    key: uuidv7(),
  };
}

export default function BookmarksPage({ loaderData }: Route.ComponentProps) {
  const { bookmarks, tags, subscribed, bsky, instance } = loaderData;
  const layout = useLayout();

  const [searchParams] = useSearchParams();
  const page = Number.parseInt(searchParams.get("page") || "1");
  const [nextPage, setNextPage] = useState(page + 1);
  const [observer, setObserver] = useState<IntersectionObserver | null>(null);
  const [fetchedBookmarks, setFetchedBookmarks] =
    useState<BookmarkWithLinkPosts[]>(bookmarks);
  const [key, setKey] = useState(loaderData.key);
  const fetcher = useFetcher<typeof loader>();
  const formRef = useRef<HTMLFormElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);

  function setupIntersectionObserver() {
    const $form = formRef.current;
    if (!$form) return;
    const debouncedSubmit = debounce(submitForm, 1000, {
      isImmediate: true,
    });
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        debouncedSubmit();
        observer.unobserve($form);
      }
    });
    observer.observe($form);
    setObserver(observer);
  }

  function submitForm() {
    const $form = formRef.current;
    if (!$form) return;
    fetcher.submit($form, { preventScrollReset: true });
    setNextPage(nextPage + 1);
  }

  const debouncedObserver = debounce(setupIntersectionObserver, 100, {
    isImmediate: true,
  });

  // Setup intersection observer after promise is resolved
  useEffect(() => {
    if (!observer) {
      setTimeout(debouncedObserver, 100);
    }
  });

  // When the fetcher has returned new links, set the state and reset the observer
  // biome-ignore lint/correctness/useExhaustiveDependencies: Can't put setupIntersectionObserver in the dependency array
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.bookmarks) {
      if (fetcher.data.bookmarks.length > 0) {
        setFetchedBookmarks(fetchedBookmarks.concat(fetcher.data.bookmarks));
        setupIntersectionObserver();
      }
    }
  }, [fetcher, fetchedBookmarks.concat]);

  // A new key signifies the server loader got new data. Clear the pagination state.
  useEffect(() => {
    if (key !== loaderData.key) {
      setKey(loaderData.key);
      setFetchedBookmarks(bookmarks);
      setNextPage(2);
    }
  }, [key, loaderData.key, bookmarks]);

  const groupedBookmarks = fetchedBookmarks.reduce((groups, bookmark) => {
    const date = new Date(`${bookmark.createdAt}Z`).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    if (!groups[date]) {
      groups[date] = [];
    }

    groups[date].push(bookmark);
    return groups;
  }, {} as Record<string, BookmarkWithLinkPosts[]>);

  const bookmarksByDate = Object.entries(groupedBookmarks);

  const hasActiveFilters = searchParams.get("query") || searchParams.get("tag");

  return (
    <Layout sidebar={<BookmarkFilters tags={tags} />}>
      <LinkFiltersCollapsible>
        <BookmarkFilters tags={tags} reverse={true} />
      </LinkFiltersCollapsible>
      <PageHeading
        title="Bookmarks"
        dek="Sill can save links you bookmark for easy access later. If you bookmark a link, Sill will track all posts sharing that link for you."
      />

      <Flex my="4" gap="3" align="center" wrap="wrap">
        <Button onClick={() => setDialogOpen(true)}>Add Bookmark</Button>
        {bookmarksByDate.length > 0 && (
          <Text size="2" color="gray">
            or{" "}
            <Link
              href="#save-links-info"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("save-links-info")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              learn how to save links from any website
            </Link>
          </Text>
        )}
      </Flex>

      <AddBookmarkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        hasBlueskyAccount={!!bsky}
      />

      <Box my="4">
        {bookmarksByDate.length > 0 ? (
          bookmarksByDate.map(([date, dateBookmarks]) => (
            <Box key={date} mb="6">
              <Heading as="h3" size="4" mb="3">
                {date}
              </Heading>
              {dateBookmarks.map((bookmark) => (
                <LinkPost
                  key={bookmark.id}
                  linkPost={bookmark.posts}
                  instance={instance}
                  bsky={bsky}
                  layout={layout}
                  bookmarks={bookmarks}
                  subscribed={subscribed}
                />
              ))}
            </Box>
          ))
        ) : (
          <Card>
            <Text as="p" mb="4">
              {hasActiveFilters
                ? "No bookmarks match your filters."
                : "You haven't bookmarked any links yet."}
            </Text>
            {!hasActiveFilters && (
              <Flex direction="column" gap="4">
                <Text as="p">
                  Bookmark posts using the bookmark icon{" "}
                  <IconButton variant="ghost" size="1">
                    <Bookmark />
                  </IconButton>{" "}
                  on links <Link href="/links">in your feed</Link>.
                </Text>

                <Separator size="4" />

                <Box id="save-links-info">
                  <Text as="p" weight="medium" mb="3">
                    Save links from any website
                  </Text>
                  <BookmarkletSetup />
                </Box>
              </Flex>
            )}
          </Card>
        )}
        <Box position="absolute" top="90%">
          <fetcher.Form method="GET" preventScrollReset ref={formRef}>
            <input type="hidden" name="page" value={nextPage} />
            {[...searchParams.entries()].map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          </fetcher.Form>
        </Box>
      </Box>

      {bookmarksByDate.length > 0 && (
        <Card mt="6" mb={{ initial: "9", md: "0" }} id="save-links-info">
          <Text as="p" size="2" weight="medium" mb="2">
            Save links from any website
          </Text>
          <BookmarkletSetup />
        </Card>
      )}
    </Layout>
  );
}
