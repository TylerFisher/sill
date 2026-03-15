import { Box, Flex, Heading, Spinner, Text } from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { debounce } from "ts-debounce";
import Layout from "~/components/nav/Layout";
import { LinkPost } from "~/routes/links/index";
import { useLayout } from "~/routes/resources/layout-switch";
import type { MostRecentLinkPosts } from "@sill/schema";
import type { Route } from "./+types/groupFeed";
import { requireUserFromContext } from "~/utils/context.server";
import { apiGetNotificationGroupItems } from "~/utils/api-client.server";

export const meta: Route.MetaFunction = ({ data }) => [
	{ title: `Sill | ${data?.groupName ?? "Notification Feed"}` },
];

export const loader = async ({
	params,
	context,
	request,
}: Route.LoaderArgs) => {
	const existingUser = await requireUserFromContext(context);
	const subscribed = existingUser.subscriptionStatus;

	const { groupId } = params;

	if (!groupId) {
		throw new Error("Group ID is required");
	}

	const url = new URL(request.url);
	const cursor = url.searchParams.get("cursor") || undefined;

	const result = await apiGetNotificationGroupItems(
		request,
		groupId,
		cursor,
	);

	const bsky = existingUser.blueskyAccounts[0];
	const mastodon = existingUser.mastodonAccounts[0];
	const bookmarks = existingUser.bookmarks;

	return {
		items: result.items,
		nextCursor: result.nextCursor,
		groupName: result.group.name,
		bsky: bsky?.handle,
		instance: mastodon?.mastodonInstance.instance,
		bookmarks,
		subscribed,
	};
};

const NotificationGroupFeed = ({ loaderData }: Route.ComponentProps) => {
	const { items, bsky, instance, bookmarks, groupName } = loaderData;
	const layout = useLayout();

	const [fetchedItems, setFetchedItems] = useState<MostRecentLinkPosts[]>([]);
	const [nextCursor, setNextCursor] = useState<string | null>(
		loaderData.nextCursor,
	);
	const [observer, setObserver] = useState<IntersectionObserver | null>(null);
	const fetcher = useFetcher<typeof loader>();
	const formRef = useRef<HTMLFormElement>(null);

	function setupIntersectionObserver() {
		const $form = formRef.current;
		if (!$form || !nextCursor) return;
		const debouncedSubmit = debounce(submitForm, 1000, {
			isImmediate: true,
		});
		const obs = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				debouncedSubmit();
				obs.unobserve($form);
			}
		});
		obs.observe($form);
		setObserver(obs);
	}

	function submitForm() {
		const $form = formRef.current;
		if (!$form) return;
		fetcher.submit($form, { preventScrollReset: true });
	}

	const debouncedObserver = debounce(setupIntersectionObserver, 100, {
		isImmediate: true,
	});

	// Setup intersection observer on initial load
	useEffect(() => {
		if (!observer && nextCursor) {
			setTimeout(debouncedObserver, 100);
		}
	});

	// When the fetcher has returned new items, append them and reset the observer
	// biome-ignore lint/correctness/useExhaustiveDependencies: Can't put setupIntersectionObserver in the dependency array
	useEffect(() => {
		if (fetcher.state === "idle" && fetcher.data?.items) {
			const newItems = fetcher.data.items.map(
				(item) => item.itemData as MostRecentLinkPosts,
			);
			if (newItems.length > 0) {
				setFetchedItems((prev) => prev.concat(newItems));
				setNextCursor(fetcher.data.nextCursor);
				setupIntersectionObserver();
			} else {
				setNextCursor(null);
			}
		}
	}, [fetcher.state, fetcher.data]);

	return (
		<Layout>
			<Heading as="h2" mt="4" size="6" mb="6">
				{groupName}
			</Heading>
			{items.length === 0 && fetchedItems.length === 0 ? (
				<Text as="p">No notification items yet.</Text>
			) : (
				<Box>
					{items.map((item) => {
						const linkPost = item.itemData as MostRecentLinkPosts;
						return (
							<div key={item.id}>
								<LinkPost
									linkPost={linkPost}
									instance={instance}
									bsky={bsky}
									layout={layout}
									bookmarks={bookmarks}
									subscribed={loaderData.subscribed}
								/>
							</div>
						);
					})}
					{fetchedItems.map((linkPost) => (
						<div key={linkPost.link?.url}>
							<LinkPost
								linkPost={linkPost}
								instance={instance}
								bsky={bsky}
								layout={layout}
								bookmarks={bookmarks}
								subscribed={loaderData.subscribed}
							/>
						</div>
					))}
					{nextCursor && fetcher.state === "loading" && (
						<Flex justify="center" my="4">
							<Spinner size="3" />
						</Flex>
					)}
					<Box position="absolute" top="90%">
						<fetcher.Form method="GET" preventScrollReset ref={formRef}>
							{nextCursor && (
								<input type="hidden" name="cursor" value={nextCursor} />
							)}
						</fetcher.Form>
					</Box>
				</Box>
			)}
		</Layout>
	);
};

export default NotificationGroupFeed;
