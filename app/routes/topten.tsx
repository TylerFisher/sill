import type { Route } from "./+types/topten";
import { eq } from "drizzle-orm";
import Layout from "~/components/nav/Layout";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { getUserId } from "~/utils/auth.server";
import { networkTopTen } from "~/utils/links.server";
import LinkRep from "~/components/linkPosts/LinkRep";
import { useLayout } from "./resources/layout-switch";
import { Box, Flex, Heading, Select, Text } from "@radix-ui/themes";
import { useSearchParams } from "react-router";
import { useState } from "react";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await getUserId(request);
	let existingUser: typeof user.$inferSelect | undefined = undefined;
	if (userId) {
		existingUser = await db.query.user.findFirst({
			where: eq(user.id, userId),
		});
	}

	const url = new URL(request.url);
	const timeParam = url.searchParams.get("time");
	let time = 10800000;

	if (timeParam === "3h") {
		time = 10800000;
	} else if (timeParam === "6h") {
		time = 21600000;
	} else if (timeParam === "12h") {
		time = 43200000;
	}

	const topTen = await networkTopTen(time);

	return {
		existingUser,
		topTen,
	};
};

const TopTen = ({ loaderData }: Route.ComponentProps) => {
	const { existingUser, topTen } = loaderData;
	const layout = useLayout();
	const [searchParams] = useSearchParams();
	const timeParam = searchParams.get("time") || "3h";
	const [time, setTime] = useState(timeParam);

	const onSelected = (value: string) => {
		setTime(value);
	};

	return (
		<Layout hideNav={!!existingUser}>
			<Flex justify="between" align="center" mb="4">
				<Heading as="h2">Top Ten Links</Heading>
				<Flex align="center" gap="1">
					<Text>Links from the last </Text>
					<Select.Root
						value={time}
						onValueChange={(value) => onSelected(value)}
					>
						<Select.Trigger variant="ghost" />
						<Select.Content>
							<Select.Item value="3h">3 hours</Select.Item>
							<Select.Item value="6h">6 hours</Select.Item>
							<Select.Item value="12h">12 hours</Select.Item>
							<Select.Item value="24h">24 hours</Select.Item>
						</Select.Content>
					</Select.Root>
				</Flex>
			</Flex>

			{topTen.map((linkPost, index) => (
				<Box mb="9" key={linkPost.link?.id} position="relative">
					<Flex
						position="absolute"
						top="10px"
						right={{
							initial: "10px",
							md: "initial",
						}}
						left={{
							initial: "initial",
							md: "-80px",
						}}
						style={{
							backgroundColor: "var(--accent-11)",
							borderRadius: "100%",
							zIndex: 1,
							color: "var(--accent-1)",
						}}
						width="50px"
						height="50px"
						justify="center"
						align="center"
					>
						<Text weight="bold" size="4">
							#{index + 1}
						</Text>
					</Flex>
					<LinkRep
						link={linkPost.link}
						instance={undefined}
						bsky={undefined}
						layout={layout}
					/>
					<Text as="p">
						Shared by {linkPost.uniqueActorsCount.toLocaleString()} accounts
					</Text>
				</Box>
			))}
		</Layout>
	);
};

export default TopTen;
