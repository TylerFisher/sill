import { Suspense, useEffect, useRef, useState } from "react";
import {
	type LoaderFunctionArgs,
	type MetaFunction,
	redirect,
} from "@vercel/remix";
import {
	Form,
	useLoaderData,
	Await,
	useFetcher,
	useSearchParams,
} from "@remix-run/react";
import { Box, Separator, Flex, Spinner } from "@radix-ui/themes";
import { debounce } from "ts-debounce";
import {
	OAuthResponseError,
	TokenRefreshError,
} from "@atproto/oauth-client-node";
import { eq } from "drizzle-orm";
import {
	type MostRecentLinkPosts,
	filterLinkOccurrences,
} from "~/utils/links.server";
import { requireUserId } from "~/utils/auth.server";
import { createOAuthClient } from "~/server/oauth/client";
import { db } from "~/drizzle/db.server";
import { blueskyAccount } from "~/drizzle/schema.server";
import LinkFilters from "~/components/forms/LinkFilters";
import SearchField from "~/components/forms/SearchField";
import LinkPostRep from "~/components/linkPosts/LinkPostRep";
import Layout from "~/components/nav/Layout";
import { connection, getUserCacheKey } from "~/utils/redis.server";
import { uuidv7 } from "uuidv7-js";

export const meta: MetaFunction = () => [{ title: "Sill" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);

	// Check if we need to reauthenticate with Bluesky
	const bsky = await db.query.blueskyAccount.findFirst({
		where: eq(blueskyAccount.userId, userId),
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
				const url = await client.authorize(bsky.handle, {
					scope: "atproto transition:generic",
					state: JSON.stringify(bsky),
				});
				return redirect(url.toString());
			}
		}
	}

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
	};

	const timeParam = url.searchParams.get("time") || "24h";
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
		fetch: url.search === "",
		...options,
	});

	// If we're not using any filters, use the cache
	let cachedData: MostRecentLinkPosts[] = [];
	if (url.search === "") {
		const redis = connection();
		const cache = await redis.get(await getUserCacheKey(userId));
		if (cache) {
			cachedData = JSON.parse(cache);
		}
		links.then(async (links) => {
			redis.set(await getUserCacheKey(userId), JSON.stringify(links));
		});
	}

	return { cachedData, links, key: uuidv7() };
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
			<Box mb="6" position="relative">
				<LinkFilters />
				<Box position="absolute" right="0" top="0" width="50%">
					<Form method="GET">
						<SearchField />
					</Form>
				</Box>
			</Box>
			<Suspense
				fallback={
					<div>
						<Flex justify="center">
							<Spinner size="3" />
						</Flex>
						{data.cachedData?.map((link) => (
							<LinkPost key={link.link?.url} linkPost={link} />
						))}
					</div>
				}
			>
				<Await resolve={data.links}>
					{(links) => (
						<div>
							{links.map((link) => (
								<div key={link.link?.url}>
									<LinkPost linkPost={link} />
								</div>
							))}
							{fetchedLinks.length > 0 && (
								<div>
									{fetchedLinks.map((link) => (
										<LinkPost key={link.link?.url} linkPost={link} />
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
						</div>
					)}
				</Await>
			</Suspense>
		</Layout>
	);
};

const LinkPost = ({ linkPost }: { linkPost: MostRecentLinkPosts }) => (
	<div>
		<LinkPostRep linkPost={linkPost} />
		<Separator my="7" size="4" orientation="horizontal" />
	</div>
);

export default Links;
