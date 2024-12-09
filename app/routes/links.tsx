import {
	OAuthResolverError,
	OAuthResponseError,
	TokenRefreshError,
} from "@atproto/oauth-client-node";
import { Box, Flex, Inset, Separator, Spinner, Text } from "@radix-ui/themes";
import {
	data,
	type LoaderFunctionArgs,
	type MetaFunction,
	redirect,
} from "@remix-run/node";
import {
	Await,
	Form,
	useFetcher,
	useLoaderData,
	useSearchParams,
} from "@remix-run/react";
import { eq } from "drizzle-orm";
import { Suspense, useEffect, useRef, useState } from "react";
import { debounce } from "ts-debounce";
import { uuidv7 } from "uuidv7-js";
import LinkFilters from "~/components/forms/LinkFilters";
import SearchField from "~/components/forms/SearchField";
import LinkPostRep from "~/components/linkPosts/LinkPostRep";
import Layout from "~/components/nav/Layout";
import { db } from "~/drizzle/db.server";
import { blueskyAccount, mastodonAccount } from "~/drizzle/schema.server";
import { createOAuthClient } from "~/server/oauth/client";
import { requireUserId } from "~/utils/auth.server";
import {
	type MostRecentLinkPosts,
	filterLinkOccurrences,
} from "~/utils/links.server";

export const meta: MetaFunction = () => [{ title: "Sill" }];

export const config = {
	maxDuration: 300,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);

	// Check if we need to reauthenticate with Bluesky
	const bsky = await db.query.blueskyAccount.findFirst({
		where: eq(blueskyAccount.userId, userId),
		with: {
			lists: true,
		},
	});
	if (bsky) {
		try {
			const client = await createOAuthClient();
			await client.restore(bsky.did);
		} catch (error) {
			if (error instanceof OAuthResponseError) {
				const client = await createOAuthClient();
				await client.restore(bsky.did);
			}
			if (error instanceof TokenRefreshError) {
				const client = await createOAuthClient();
				const url = await client.authorize(bsky.did, {
					scope: "atproto transition:generic",
				});
				return redirect(url.toString());
			}
			if (error instanceof OAuthResolverError) {
				return redirect("/connect?error=resolver");
			}
		}
	}

	const mastodon = await db.query.mastodonAccount.findFirst({
		where: eq(mastodonAccount.userId, userId),
		with: {
			mastodonInstance: {
				columns: {
					instance: true,
				},
			},
			lists: true,
		},
	});

	const url = new URL(request.url);

	const options = {
		hideReposts: url.searchParams.get("reposts") === "true",
		sort: url.searchParams.get("sort") || "popularity",
		query: url.searchParams.get("query") || undefined,
		// eugh, clean this up
		service: ["mastodon", "bluesky", "all"].includes(
			url.searchParams.get("service") || "",
		)
			? (url.searchParams.get("service") as "mastodon" | "bluesky" | "all")
			: "all",
		page: Number.parseInt(url.searchParams.get("page") || "1"),
		selectedList: url.searchParams.get("list") || "all",
	};

	const timeParam = url.searchParams.get("time");
	let time = 86400000;

	if (timeParam === "3h") {
		time = 10800000;
	} else if (timeParam === "6h") {
		time = 21600000;
	} else if (timeParam === "12h") {
		time = 43200000;
	}

	const links = filterLinkOccurrences({
		userId,
		time,
		fetch: !url.searchParams.get("page"),
		...options,
	});

	return {
		links,
		key: uuidv7(),
		instance: mastodon?.mastodonInstance.instance,
		bsky: bsky?.handle,
		lists: [...(bsky?.lists ?? []), ...(mastodon?.lists ?? [])],
	};
};

const Links = () => {
	const data = useLoaderData<typeof loader>();
	const [searchParams] = useSearchParams();
	const page = Number.parseInt(searchParams.get("page") || "1");
	const [nextPage, setNextPage] = useState(page + 1);
	const [observer, setObserver] = useState<IntersectionObserver | null>(null);
	const [fetchedLinks, setFetchedLinks] = useState<MostRecentLinkPosts[]>([]);
	const [key, setKey] = useState(data.key);
	const fetcher = useFetcher<typeof loader>();
	const formRef = useRef<HTMLFormElement>(null);

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
		data.links.then(() => {
			if (!observer) {
				setTimeout(debouncedObserver, 100);
			}
		});
	});

	// When the fetcher has returned new links, set the state and reset the observer
	// biome-ignore lint/correctness/useExhaustiveDependencies: Can't put setupIntersectionObserver in the dependency array
	useEffect(() => {
		if (fetcher.state === "idle" && fetcher.data?.links) {
			fetcher.data.links.then((links) => {
				if (links.length > 0) {
					setFetchedLinks(fetchedLinks.concat(links));
					setupIntersectionObserver();
				}
			});
		}
	}, [fetcher, fetchedLinks.concat]);

	// A new key signifies the server loader got new data. Clear the pagination state.
	useEffect(() => {
		if (key !== data.key) {
			setKey(data.key);
			setFetchedLinks([]);
		}
	}, [key, data.key]);

	return (
		<Layout>
			<Box
				mb="6"
				position="sticky"
				top="0"
				py="4"
				px="4"
				mx="-4"
				style={{
					zIndex: 1,
					backgroundColor: "var(--accent-1)",
					borderBottom: "1px solid var(--gray-a6)",
				}}
			>
				<LinkFilters
					showService={!!(data.bsky && data.instance)}
					lists={data.lists}
				/>
				<Box position="absolute" right="16px" top="8px" width="50%">
					<Form method="GET">
						<SearchField />
					</Form>
				</Box>
			</Box>

			<Suspense
				fallback={
					<Box
						mx={{
							initial: "0",
							sm: "9",
							md: "0",
						}}
					>
						<Flex justify="center">
							<Spinner size="3" />
						</Flex>
					</Box>
				}
			>
				<Await
					resolve={data.links}
					errorElement={
						<Box
							mx={{
								initial: "0",
								sm: "9",
								md: "0",
							}}
						>
							<Text as="p">
								Failed to fetch new links. Try refreshing the page.
							</Text>
						</Box>
					}
				>
					{(links) => (
						<Box
							mx={{
								initial: "0",
								sm: "9",
								md: "0",
							}}
						>
							{links.map((link) => (
								<div key={link.link?.url}>
									<LinkPost
										linkPost={link}
										instance={data.instance}
										bsky={data.bsky}
									/>
								</div>
							))}
							{fetchedLinks.length > 0 && (
								<div>
									{fetchedLinks.map((link) => (
										<LinkPost
											key={link.link?.url}
											linkPost={link}
											instance={data.instance}
											bsky={data.bsky}
										/>
									))}
								</div>
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
					)}
				</Await>
			</Suspense>
		</Layout>
	);
};

const LinkPost = ({
	linkPost,
	instance,
	bsky,
}: {
	linkPost: MostRecentLinkPosts;
	instance: string | undefined;
	bsky: string | undefined;
}) => (
	<div>
		<LinkPostRep linkPost={linkPost} instance={instance} bsky={bsky} />
		<Separator my="7" size="4" orientation="horizontal" />
	</div>
);

export default Links;
