import { Box, Card, Flex, Separator, Spinner, Text } from "@radix-ui/themes";
import type { SubscriptionStatus } from "@sill/schema";
import type { MostRecentLinkPosts } from "@sill/schema";
import {
  Fragment,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Await,
  type ShouldRevalidateFunctionArgs,
  useFetcher,
  useLocation,
  useNavigation,
  useRevalidator,
  useSearchParams,
} from "react-router";
import { redirect } from "react-router";
import { debounce } from "ts-debounce";
import { uuidv7 } from "uuidv7-js";
import FilterBar from "~/components/forms/FilterBar";
import LinkPostRep from "~/components/linkPosts/LinkPostRep";
import PlusPromoCard from "~/components/subscription/PlusPromoCard";
import {
  SourceBadgeProvider,
  buildSourceBadgeValue,
} from "~/components/linkPosts/SourceBadge";
import Layout from "~/components/nav/Layout";
import { useFilterStorage } from "~/hooks/useFilterStorage";
import { useOptimisticMutes } from "~/hooks/useOptimisticMutes";
import { useLayout } from "~/routes/resources/layout-switch";
import {
  apiFilterLinkOccurrences,
  apiGetFilterPresets,
} from "~/utils/api-client.server";
import { requireUserFromContext } from "~/utils/context.server";
import { isPlusTimeValue, timeParamToMs } from "~/utils/timeRange";
import type { BookmarkWithLinkPosts } from "../bookmarks";
import type { Route } from "./+types/index";

export const meta: Route.MetaFunction = () => [{ title: "Sill" }];

export const config = {
  maxDuration: 300,
};

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const userProfile = await requireUserFromContext(context);
  const subscribed = userProfile.subscriptionStatus;

  const showPlusPromo =
    (userProfile.agreedToLatestTerms ?? true) &&
    subscribed !== "plus" &&
    !userProfile.seenPlusPromo;

  const bsky = userProfile.blueskyAccounts[0] || null;
  const mastodon = userProfile.mastodonAccounts[0] || null;
  const bookmarks = userProfile.bookmarks;

  const url = new URL(request.url);

  const minSharesParam = url.searchParams.get("minShares");
  const minShares = minSharesParam
    ? Number.parseInt(minSharesParam)
    : undefined;

  // Backwards compatibility: translate old boolean values to new string values
  const repostsParam = url.searchParams.get("reposts");
  let hideReposts: "include" | "exclude" | "only" = "include";
  let needsRedirect = false;

  if (repostsParam === "false") {
    hideReposts = "include";
    needsRedirect = true;
  } else if (repostsParam === "true") {
    hideReposts = "exclude";
    needsRedirect = true;
  } else if (
    repostsParam &&
    ["include", "exclude", "only"].includes(repostsParam)
  ) {
    hideReposts = repostsParam as "include" | "exclude" | "only";
  }

  // Redirect to update the URL with the new parameter value
  if (needsRedirect) {
    const newUrl = new URL(request.url);
    newUrl.searchParams.set("reposts", hideReposts);
    throw redirect(newUrl.toString());
  }

  const serviceParam = ["mastodon", "bluesky", "all"].includes(
    url.searchParams.get("service") || ""
  )
    ? (url.searchParams.get("service") as "mastodon" | "bluesky" | "all")
    : "all";
  // Coerce a service filter that points at a disconnected account (e.g. a saved
  // `service=mastodon` after the user disconnects Mastodon) to "all", so a stale
  // preference can't leave the feed permanently empty. The client also clears
  // the stale param/pref (see the component) so the URL heals too.
  const service =
    (serviceParam === "mastodon" && !mastodon) ||
    (serviceParam === "bluesky" && !bsky)
      ? "all"
      : serviceParam;

  const options = {
    hideReposts,
    sort: url.searchParams.get("sort") || "popularity",
    query: url.searchParams.get("query") || undefined,
    service,
    page: Number.parseInt(url.searchParams.get("page") || "1"),
    selectedList: url.searchParams.get("list") || "all",
    minShares: minShares && minShares > 0 ? minShares : undefined,
  };

  // The wider windows (7/14/30d) are Sill+ only. Clamp a free user who somehow
  // arrives with one (stale saved filter, hand-edited URL) back to the default.
  const timeParam = url.searchParams.get("time");
  const time = timeParamToMs(
    subscribed !== "plus" && isPlusTimeValue(timeParam) ? null : timeParam
  );

  const links = apiFilterLinkOccurrences(request, {
    time,
    fetch: false,
    ...options,
  });

  const lists = [...(bsky?.lists ?? []), ...(mastodon?.lists ?? [])];

  // Saved filter presets for the sidebar. Resilient to API hiccups — a failure
  // here shouldn't take down the feed.
  const filterPresets = await apiGetFilterPresets(request)
    .then((r) => r.presets)
    .catch((error) => {
      console.error("Load filter presets error:", error);
      return [] as Awaited<
        ReturnType<typeof apiGetFilterPresets>
      >["presets"];
    });

  return {
    links,
    key: uuidv7(),
    instance: mastodon?.mastodonInstance?.instance,
    bsky: bsky?.handle,
    lists,
    bookmarks,
    subscribed,
    showPlusPromo,
    filterPresets,
  };
};

// Saving or deleting a filter preset must not reload the streaming feed; the
// FilterPresets component refreshes itself from the mutation's returned list.
export function shouldRevalidate({
  formAction,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (formAction === "/api/filter-presets") return false;
  return defaultShouldRevalidate;
}

const SEEDING_POLL_MS = 5000;

const SeedingState = () => {
  const revalidator = useRevalidator();
  // Hold the latest revalidate in a ref so the interval effect can run once
  // (empty deps) without capturing a stale closure.
  const revalidate = useRef(revalidator.revalidate);
  revalidate.current = revalidator.revalidate;

  useEffect(() => {
    const id = setInterval(() => revalidate.current(), SEEDING_POLL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <Card mt="4">
      <Flex direction="column" align="center" gap="3" py="6" px="4">
        <Spinner size="3" />
        <Text as="p" size="3" weight="bold">
          Setting up your network
        </Text>
        <Text as="p" size="2" color="gray" align="center">
          Sill is gathering the links your network is sharing. This can take a
          minute. New links will appear here automatically.
        </Text>
      </Flex>
    </Card>
  );
};

const Links = ({ loaderData }: Route.ComponentProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const showPlusPromo = loaderData.showPlusPromo;
  const { clearFilterFromStorage } = useFilterStorage();
  const page = Number.parseInt(searchParams.get("page") || "1");
  const [nextPage, setNextPage] = useState(page + 1);
  const [observer, setObserver] = useState<IntersectionObserver | null>(null);
  const [fetchedLinks, setFetchedLinks] = useState<MostRecentLinkPosts[]>([]);
  const seenUrls = useRef<Set<string>>(new Set());
  const [key, setKey] = useState(loaderData.key);
  const fetcher = useFetcher<typeof loader>();
  const formRef = useRef<HTMLFormElement>(null);
  const navigation = useNavigation();
  const location = useLocation();

  useEffect(() => {
    const service = searchParams.get("service");
    const stale =
      (service === "mastodon" && !loaderData.instance) ||
      (service === "bluesky" && !loaderData.bsky);
    if (!stale) return;
    clearFilterFromStorage("service");
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("service");
        return next;
      },
      { replace: true }
    );
  }, [
    searchParams,
    loaderData.instance,
    loaderData.bsky,
    clearFilterFromStorage,
    setSearchParams,
  ]);

  const isPending =
    navigation.state === "loading" &&
    navigation.location?.pathname === location.pathname &&
    (navigation.location.search ?? "") !== (location.search ?? "");

  const [showPending, setShowPending] = useState(false);
  useEffect(() => {
    if (!isPending) {
      setShowPending(false);
      return;
    }
    const t = setTimeout(() => setShowPending(true), 50);
    return () => clearTimeout(t);
  }, [isPending]);

  const pendingQuery = showPending
    ? new URLSearchParams(navigation.location?.search ?? "").get("query") ?? ""
    : "";

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

  useEffect(() => {
    loaderData.links.then((data) => {
      for (const link of data.links) {
        if (link.link?.url) seenUrls.current.add(link.link.url);
      }
      if (!observer) {
        setTimeout(debouncedObserver, 100);
      }
    });
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: Can't put setupIntersectionObserver in the dependency array
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.links) {
      fetcher.data.links.then((data) => {
        const fresh = data.links.filter((link) => {
          const url = link.link?.url;
          if (!url || seenUrls.current.has(url)) return false;
          seenUrls.current.add(url);
          return true;
        });
        if (fresh.length > 0) {
          setFetchedLinks((prev) => prev.concat(fresh));
          setupIntersectionObserver();
        }
      });
    }
  }, [fetcher, fetchedLinks.concat]);

  // A new key signifies the server loader got new data. Clear the pagination
  // state and the seen-URL set (page 1 reseeds via the observer effect above).
  useEffect(() => {
    if (key !== loaderData.key) {
      setKey(loaderData.key);
      setFetchedLinks([]);
      seenUrls.current = new Set();
    }
  }, [key, loaderData.key]);

  const layout = useLayout();
  const { isMuted } = useOptimisticMutes();

  const sourceBadge = useMemo(
    () =>
      buildSourceBadgeValue(
        loaderData.lists,
        loaderData.instance,
        searchParams.get("list")
      ),
    [loaderData.lists, loaderData.instance, searchParams]
  );

  return (
    <SourceBadgeProvider value={sourceBadge}>
      <Layout>
        <FilterBar
          showService={!!(loaderData.bsky && loaderData.instance)}
          lists={loaderData.lists}
          subscribed={loaderData.subscribed}
          presets={loaderData.filterPresets}
        />
        <Box position="relative">
          {/* Floating overlay indicator. `position: fixed` takes the pill
				    completely out of document flow so toggling it never shifts
				    the cards below — sticky still claims its initial flow slot
				    before pinning, which produced the residual nudge. Fixed
				    also keeps the indicator pinned to the viewport so it stays
				    visible no matter how far down the user has scrolled. */}
          {showPending && (
            <Box
              aria-live="polite"
              style={{
                position: "fixed",
                top: 16,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 50,
                pointerEvents: "none",
              }}
            >
              <Card
                variant="surface"
                size="1"
                style={{ pointerEvents: "auto" }}
              >
                <Flex gap="2" align="center" px="2">
                  <Spinner size="2" />
                  <Text size="2" color="gray">
                    {pendingQuery
                      ? `Searching for “${pendingQuery}”…`
                      : "Updating results…"}
                  </Text>
                </Flex>
              </Card>
            </Box>
          )}
          <Suspense
            fallback={
              <Box>
                <Flex justify="center">
                  <Spinner size="3" />
                </Flex>
              </Box>
            }
          >
            <Await
              resolve={loaderData.links}
              errorElement={
                <Box>
                  <Text as="p">
                    Failed to fetch new links. Try refreshing the page.
                  </Text>
                </Box>
              }
            >
              {(data) =>
                data.cold && data.links.length === 0 ? (
                  <SeedingState />
                ) : (
                  <Box
                    aria-busy={showPending}
                    style={{
                      opacity: showPending ? 0.55 : 1,
                      transition: "opacity 150ms ease",
                      pointerEvents: showPending ? "none" : "auto",
                    }}
                  >
                    {data.links
                      .filter((link) => !isMuted(link))
                      .map((link, i) => (
                        // Include the loader key so cards remount when the feed
                        // reloads (e.g. filtering to a list), discarding any posts
                        // hydrated for a URL under the previous filters.
                        <Fragment key={`${loaderData.key}:${link.link?.url}`}>
                          <div>
                            <LinkPost
                              linkPost={link}
                              instance={loaderData.instance}
                              bsky={loaderData.bsky}
                              layout={layout}
                              bookmarks={loaderData.bookmarks}
                              subscribed={loaderData.subscribed}
                            />
                          </div>
                          {showPlusPromo && i === 2 && (
                            <PlusPromoCard layout={layout} />
                          )}
                        </Fragment>
                      ))}
                    {fetchedLinks.length > 0 && (
                      <div>
                        {fetchedLinks
                          .filter((link) => !isMuted(link))
                          .map((link) => (
                            <LinkPost
                              key={link.link?.url}
                              linkPost={link}
                              instance={loaderData.instance}
                              bsky={loaderData.bsky}
                              layout={layout}
                              bookmarks={loaderData.bookmarks}
                              subscribed={loaderData.subscribed}
                            />
                          ))}
                      </div>
                    )}
                    <Box position="absolute" top="90%">
                      <fetcher.Form
                        method="GET"
                        preventScrollReset
                        ref={formRef}
                      >
                        <input type="hidden" name="page" value={nextPage} />
                        {[...searchParams.entries()].map(([key, value]) => (
                          <input
                            key={key}
                            type="hidden"
                            name={key}
                            value={value}
                          />
                        ))}
                      </fetcher.Form>
                    </Box>
                  </Box>
                )
              }
            </Await>
          </Suspense>
        </Box>
      </Layout>
    </SourceBadgeProvider>
  );
};

export const LinkPost = ({
  linkPost,
  instance,
  bsky,
  layout,
  bookmarks,
  subscribed,
}: {
  linkPost: MostRecentLinkPosts;
  instance: string | undefined;
  bsky: string | undefined;
  layout: "dense" | "default";
  bookmarks: BookmarkWithLinkPosts[];
  subscribed: SubscriptionStatus;
}) => {
  const location = useLocation();
  return (
    <div>
      <LinkPostRep
        linkPost={linkPost}
        instance={instance}
        bsky={bsky}
        layout={layout}
        autoExpand={location.hash.substring(1) === linkPost.link?.id}
        bookmarks={bookmarks}
        subscribed={subscribed}
      />
      {layout === "default" ? (
        <Separator my="7" size="4" orientation="horizontal" />
      ) : (
        <Box my="5" />
      )}
    </div>
  );
};

export default Links;
