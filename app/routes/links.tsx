import { useState, Suspense } from "react";
import {
	type LoaderFunctionArgs,
	type MetaFunction,
	defer,
	redirect,
} from "@remix-run/node";
import { Form, useLoaderData, useSearchParams, Await } from "@remix-run/react";
import {
	Box,
	Separator,
	Button,
	Flex,
	TextField,
	Spinner,
} from "@radix-ui/themes";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
	ChevronDownIcon,
	ChevronUpIcon,
	MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { countLinkOccurrences } from "~/routes/links.server";
import { requireUserId } from "~/utils/auth.server";
import LinkPostRep from "~/components/LinkPostRep";
import FilterButtonGroup, {
	type ButtonProps,
} from "~/components/FilterButtonGroup";
import Layout from "~/components/Layout";
import {
	OAuthResponseError,
	TokenRefreshError,
} from "@atproto/oauth-client-node";
import { createOAuthClient } from "~/server/oauth/client";
import { db } from "~/drizzle/db.server";
import { eq } from "drizzle-orm";
import { blueskyAccount } from "~/drizzle/schema.server";

export const meta: MetaFunction = () => [{ title: "Sill" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);
	const url = new URL(request.url);
	const time = url.searchParams.get("time") || "86400000";
	const hideReposts = url.searchParams.get("reposts") === "true";
	const sort = url.searchParams.get("sort") || "popularity";
	const query = url.searchParams.get("query") || undefined;
	const service = url.searchParams.get("service") || "all";

	// check if we need to reauthenticate with bluesky
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

	const links = countLinkOccurrences({
		userId,
		time: Number.parseInt(time),
		hideReposts,
		sort,
		query,
		service,
		fetch: true,
	});

	return defer({ links });
};

const Links = () => {
	const [open, setOpen] = useState(false);

	const data = useLoaderData<typeof loader>();
	const [searchParams, setSearchParams] = useSearchParams();

	function setSearchParam(param: string, value: string) {
		setSearchParams((prev) => {
			prev.set(param, value);
			return prev;
		});
	}

	const timeButtons: ButtonProps[] = [
		{
			value: "10800000",
			label: "3 hours",
		},
		{
			value: "21600000",
			label: "6 hours",
		},
		{
			value: "43200000",
			label: "12 hours",
		},
		{
			value: "86400000",
			label: "24 hours",
		},
	];

	const repostButtons: ButtonProps[] = [
		{
			value: "true",
			label: "Yes",
		},
		{
			value: "false",
			label: "No",
		},
	];

	const sortButtons: ButtonProps[] = [
		{
			value: "newest",
			label: "Newest",
		},
		{
			value: "popularity",
			label: "Most popular",
		},
	];

	const serviceButtons: ButtonProps[] = [
		{
			value: "bluesky",
			label: "Bluesky",
		},
		{
			value: "mastodon",
			label: "Mastodon",
		},
		{
			value: "all",
			label: "All",
		},
	];

	const currentTime = searchParams.get("time") || "86400000";
	const currentRepost = searchParams.get("reposts") || "false";
	const currentSort = searchParams.get("sort") || "popularity";

	return (
		<Layout>
			<Box mb="6">
				<Flex justify="between" align="start">
					<Collapsible.Root
						className="CollapsibleRoot"
						open={open}
						onOpenChange={setOpen}
					>
						<Collapsible.Trigger asChild>
							<Button variant="ghost" size="2">
								Filters
								{open ? <ChevronUpIcon /> : <ChevronDownIcon />}
							</Button>
						</Collapsible.Trigger>
						<Collapsible.Content>
							<Box mt="4">
								<FilterButtonGroup
									heading="Hide reposts"
									param="reposts"
									buttonData={repostButtons}
									setter={setSearchParam}
									variantCheck={currentRepost}
								/>
								<FilterButtonGroup
									heading="Sort by"
									param="sort"
									buttonData={sortButtons}
									setter={setSearchParam}
									variantCheck={currentSort}
								/>
								<FilterButtonGroup
									heading="Show posts from the last"
									param="time"
									buttonData={timeButtons}
									setter={setSearchParam}
									variantCheck={currentTime}
								/>
								<FilterButtonGroup
									heading="Service"
									param="service"
									buttonData={serviceButtons}
									setter={setSearchParam}
									variantCheck={searchParams.get("service") || "all"}
								/>
							</Box>
						</Collapsible.Content>
					</Collapsible.Root>
					<Box width="50%">
						<Form method="GET">
							<TextField.Root
								name="query"
								type="text"
								defaultValue={searchParams.get("query") || ""}
							>
								<TextField.Slot>
									<MagnifyingGlassIcon height="16" width="16" />
								</TextField.Slot>
								<TextField.Slot>
									<Button type="submit" variant="ghost">
										Search
									</Button>
								</TextField.Slot>
							</TextField.Root>
						</Form>
					</Box>
				</Flex>
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
