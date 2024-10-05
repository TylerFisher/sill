import {
	type LoaderFunctionArgs,
	type MetaFunction,
	json,
} from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { Container, Box, Separator, Heading } from "@radix-ui/themes";
import { countLinkOccurrences } from "~/models/links.server";
import { requireUserId } from "~/session.server";
import LinkPostRep from "~/components/LinkPostRep";
import FilterButtonGroup, {
	type ButtonProps,
} from "~/components/FilterButtonGroup";

export const meta: MetaFunction = () => [{ title: "Links" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);
	const url = new URL(request.url);
	const time = url.searchParams.get("time") || "86400000";
	const hideReposts = url.searchParams.get("reposts") === "true";
	const sort = url.searchParams.get("sort") || undefined;
	const links = await countLinkOccurrences(
		userId,
		Number.parseInt(time),
		hideReposts,
		sort,
	);

	return json({ links });
};

const Links = () => {
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

	const currentTime = searchParams.get("time") || "86400000";
	const currentRepost = searchParams.get("reposts") || "false";
	const currentSort = searchParams.get("sort") || "popularity";

	return (
		<Container size="2">
			<div
				style={{
					backgroundColor: "var(--accent-1)",
					padding: "1em",
					borderLeft: "1px solid var(--accent-a6)",
					borderRight: "1px solid var(--accent-a6)",
				}}
			>
				<Box mb="6">
					<Heading as="h2" mb="2">
						Filters
					</Heading>
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
				</Box>
				<Heading as="h2" mb="2">
					Links
				</Heading>
				{data.links.map((link, i) => (
					<>
						<LinkPostRep key={link[0]} link={link[0]} linkPosts={link[1]} />
						{i < data.links.length - 1 && (
							<Separator my="7" size="4" orientation="horizontal" />
						)}
					</>
				))}
			</div>
		</Container>
	);
};

export default Links;
