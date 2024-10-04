import {
	type LoaderFunctionArgs,
	type MetaFunction,
	json,
} from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { Container, Box, Button, Flex, Heading } from "@radix-ui/themes";
import { countLinkOccurrences } from "~/models/links.server";
import { requireUserId } from "~/session.server";
import LinkRep from "~/components/LinkRep";
import PostRep from "~/components/PostRep";
import TimeSelectButton from "~/components/TimeSelectButton";

export const meta: MetaFunction = () => [{ title: "Links" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);
	const time = new URL(request.url).searchParams.get("time") || "86400000";
	const links = await countLinkOccurrences(userId, Number.parseInt(time));

	return json({ links });
};

const Links = () => {
	const data = useLoaderData<typeof loader>();
	const [searchParams, setSearchParams] = useSearchParams();

	function setTimeParam(time: string) {
		setSearchParams((prev) => {
			prev.set("time", time);
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

	return (
		<Container mt="9">
			<Box mb="5">
				<Heading mb="2">Select time range</Heading>
				<Flex gap="3">
					{buttons.map((button) => (
						<TimeSelectButton
							key={button.time}
							time={button.time}
							color={
								searchParams.get("time") === button.time ? "amber" : "gray"
							}
							setter={setTimeParam}
							label={button.label}
						/>
					))}
				</Flex>
			</Box>

			{data.links.map((link) => (
				<Box key={link[1][0].link.id} mb="5" maxWidth="600px">
					<LinkRep
						link={link[1][0].link}
						numPosts={[...new Set(link[1].map((l) => l.actorHandle))].length}
					/>
					{link[1].map((linkPost) => (
						<PostRep
							key={linkPost.post.id}
							post={linkPost.post}
							linkPostActor={linkPost.actor}
						/>
					))}
				</Box>
			))}
		</Container>
	);
};

export default Links;
