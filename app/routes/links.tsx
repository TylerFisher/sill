import { useState } from "react";
import {
	type LoaderFunctionArgs,
	type MetaFunction,
	json,
} from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import {
	Button,
	Container,
	Box,
	Flex,
	Heading,
	Separator,
} from "@radix-ui/themes";
import { countLinkOccurrences } from "~/models/links.server";
import { requireUserId } from "~/session.server";
import LinkPostRep from "~/components/LinkPostRep";
import TimeSelectButton from "~/components/TimeSelectButton";

export const meta: MetaFunction = () => [{ title: "Links" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);
	const url = new URL(request.url);
	const time = url.searchParams.get("time") || "86400000";
	const hideReposts = url.searchParams.get("reposts") === "true";
	const links = await countLinkOccurrences(
		userId,
		Number.parseInt(time),
		hideReposts,
	);

	return json({ links });
};

const Links = () => {
	const data = useLoaderData<typeof loader>();
	const [searchParams, setSearchParams] = useSearchParams({});

	function setTimeParam(time: string) {
		setSearchParams((prev) => {
			prev.set("time", time);
			return prev;
		});
	}

	function setRepostsParam(value: string) {
		setSearchParams((prev) => {
			prev.set("reposts", value);
			return prev;
		});
	}

	const buttons = [
		{
			time: "10800000",
			label: "3 hours",
		},
		{
			time: "21600000",
			label: "6 hours",
		},
		{
			time: "43200000",
			label: "12 hours",
		},
		{
			time: "86400000",
			label: "24 hours",
		},
	];

	const currentTime = searchParams.get("time") || "86400000";

	return (
		<Container mt="9" maxWidth="640px">
			<Box mb="8">
				<Heading mb="2">Show links posted in the last</Heading>
				<Flex gap="3">
					{buttons.map((button) => (
						<TimeSelectButton
							key={button.time}
							time={button.time}
							setter={setTimeParam}
							label={button.label}
							variant={currentTime === button.time ? "solid" : "outline"}
						/>
					))}
				</Flex>
				<Heading mt="2" mb="2">
					Hide reposts
				</Heading>
				<Flex gap="3">
					<Button
						variant={
							searchParams.get("reposts") === "true" ? "solid" : "outline"
						}
						onClick={() => setRepostsParam("true")}
					>
						Yes
					</Button>
					<Button
						variant={
							searchParams.get("reposts") === "true" ? "outline" : "solid"
						}
						onClick={() => setRepostsParam("false")}
					>
						No
					</Button>
				</Flex>
			</Box>

			{data.links.map((link, i) => (
				<>
					<LinkPostRep key={link[0]} link={link[0]} linkPosts={link[1]} />
					{i < data.links.length - 1 && (
						<Separator my="7" size="4" orientation="horizontal" />
					)}
				</>
			))}
		</Container>
	);
};

export default Links;
