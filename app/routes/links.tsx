import { Suspense } from "react";
import {
	type LoaderFunctionArgs,
	type MetaFunction,
	defer,
	redirect,
} from "@remix-run/node";
import { Form, useLoaderData, Await } from "@remix-run/react";
import { Box, Separator, Flex, Spinner } from "@radix-ui/themes";
import {
	OAuthResponseError,
	TokenRefreshError,
} from "@atproto/oauth-client-node";
import { eq } from "drizzle-orm";
import { countLinkOccurrences } from "~/routes/links.server";
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
	};

	const links = countLinkOccurrences({
		userId,
		fetch: true,
		...options,
	});

	return defer({ links });
};

const Links = () => {
	const data = useLoaderData<typeof loader>();
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
							{links.map((link, i) => (
								<div key={link[0]}>
									<LinkPostRep link={link[0]} linkPosts={link[1]} />
									{i < links.length - 1 && (
										<Separator my="7" size="4" orientation="horizontal" />
									)}
								</div>
							))}
						</div>
					)}
				</Await>
			</Suspense>
		</Layout>
	);
};

export default Links;
