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
	countLinkOccurrences,
	type MostRecentLinkPosts,
} from "~/utils/links.server";
import { requireUserId } from "~/utils/auth.server";
import { createOAuthClient } from "~/server/oauth/client";
import { db } from "~/drizzle/db.server";
import { blueskyAccount } from "~/drizzle/schema.server";
import LinkFilters from "~/components/forms/LinkFilters";
import SearchField from "~/components/forms/SearchField";
import LinkPostRep from "~/components/linkPosts/LinkPostRep";
import Layout from "~/components/nav/Layout";

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
		time: Number.parseInt(url.searchParams.get("time") || "86400000"),
		hideReposts: url.searchParams.get("reposts") === "true",
		sort: url.searchParams.get("sort") || "popularity",
		query: url.searchParams.get("query") || undefined,
		service: url.searchParams.get("service") || "all",
		page: Number.parseInt(url.searchParams.get("page") || "1"),
	};

	const links = countLinkOccurrences({
		userId,
		fetch: true,
		...options,
	});

	return { links };
};

const Links = () => {
	const data = useLoaderData<typeof loader>();
	const [searchParams] = useSearchParams();
	const page = Number.parseInt(searchParams.get("page") || "1");
	const [nextPage, setNextPage] = useState(page + 1);
	const [observer, setObserver] = useState<IntersectionObserver | null>(null);
	const [fetchedLinks, setFetchedLinks] = useState<
		[string, MostRecentLinkPosts[]][]
	>([]);
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
		fetcher.submit(formRef.current, { preventScrollReset: true });
		setNextPage(nextPage + 1);
	}

	const debouncedObserver = debounce(setupIntersectionObserver, 100, {
		isImmediate: true,
	});

	useEffect(() => {
		data.links.then(() => {
			if (!observer) {
				debouncedObserver();
			}
		});
	});

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
					<Flex justify="center">
						<Spinner size="3" />
					</Flex>
				}
			>
				<Await resolve={data.links}>
					{(links) => (
						<div>
							{links.map((link) => (
								<div key={link[0]}>
									<LinkPost key={link[0]} linkPost={link} />
								</div>
							))}
							{fetchedLinks && (
								<div>
									{fetchedLinks.map((link) => (
										<LinkPost key={link[0]} linkPost={link} />
									))}
								</div>
							)}
							<Box mt="4">
								<fetcher.Form method="GET" preventScrollReset ref={formRef}>
									<input type="hidden" name="page" value={nextPage} />
								</fetcher.Form>
							</Box>
						</div>
					)}
				</Await>
			</Suspense>
		</Layout>
	);
};

const LinkPost = ({
	linkPost,
}: { linkPost: [string, MostRecentLinkPosts[]] }) => (
	<div>
		<LinkPostRep link={linkPost[0]} linkPosts={linkPost[1]} />
		<Separator my="7" size="4" orientation="horizontal" />
	</div>
);

export default Links;
