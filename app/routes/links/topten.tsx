import type { Route } from "./+types/topten";
import { eq } from "drizzle-orm";
import Layout from "~/components/nav/Layout";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { getUserId } from "~/utils/auth.server";
import { networkTopTen } from "~/utils/links.server";
import LinkRep from "~/components/linkPosts/LinkRep";
import { useLayout } from "../resources/layout-switch";
import {
	Box,
	Button,
	Flex,
	Heading,
	Select,
	Separator,
	Spinner,
	Text,
} from "@radix-ui/themes";
import { Await, NavLink, useSearchParams } from "react-router";
import { Suspense, useState } from "react";
import PostRep from "~/components/linkPosts/PostRep";

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

	if (timeParam === "6h") {
		time = 21600000;
	} else if (timeParam === "12h") {
		time = 43200000;
	} else if (timeParam === "24h") {
		time = 86400000;
	}

	const topTen = networkTopTen(time);

	return {
		existingUser,
		topTen,
	};
};

const TopTen = ({ loaderData }: Route.ComponentProps) => {
	const { existingUser, topTen } = loaderData;
	const layout = useLayout();
	const [searchParams, setSearchParams] = useSearchParams();
	const timeParam = searchParams.get("time") || "3h";
	const [time, setTime] = useState(timeParam);

	const onSelected = (value: string) => {
		setTime(value);
		setSearchParam("time", value);
	};

	function setSearchParam(param: string, value: string) {
		setSearchParams((prev) => {
			prev.set(param, value);
			return prev;
		});
	}

	return (
		<>
			{!existingUser && (
				<Box
					position="fixed"
					width="100%"
					bottom="0"
					p="4"
					style={{
						backgroundColor: "var(--accent-1)",
						zIndex: 2,
						borderTop: "1px solid var(--accent-11)",
					}}
				>
					<Flex justify="center" align="center" direction="column" gap="2">
						<Text as="p">
							Want to see the most popular links in your own network?{" "}
						</Text>
						<Text as="p">
							{existingUser ? (
								<NavLink to="/links">
									<Button type="button">See your top links</Button>
								</NavLink>
							) : (
								<NavLink to="/accounts/signup">
									<Button type="button" size="4">
										Sign up for Sill
									</Button>
								</NavLink>
							)}
						</Text>
					</Flex>
				</Box>
			)}

			<Layout hideNav={!existingUser}>
				<Flex justify="between" align="center" mb="4">
					<Heading as="h2">The Sill Six</Heading>
					<Flex align="center" gap="1">
						<Text>From the last </Text>
						<Select.Root
							value={time}
							onValueChange={(value) => onSelected(value)}
						>
							<Select.Trigger />
							<Select.Content>
								<Select.Item value="3h">3 hours</Select.Item>
								<Select.Item value="6h">6 hours</Select.Item>
								<Select.Item value="12h">12 hours</Select.Item>
								<Select.Item value="24h">24 hours</Select.Item>
							</Select.Content>
						</Select.Root>
					</Flex>
				</Flex>

				<Suspense
					fallback={
						<Box>
							<Flex justify="center">
								<Spinner size="3" />
							</Flex>
						</Box>
					}
				>
					<Await resolve={topTen}>
						{(topTen) => (
							<Box>
								{topTen.map((linkPost, index) => (
									<Box key={linkPost.link?.id} position="relative">
										<Flex
											position="absolute"
											top="10px"
											right="10px"
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
											<Text
												size="6"
												style={{
													fontWeight: "900",
													fontStyle: "italic",
													// top: "2px",
													position: "relative",
												}}
											>
												{index + 1}
											</Text>
										</Flex>
										<LinkRep
											link={linkPost.link}
											instance={undefined}
											bsky={undefined}
											layout={layout}
											toolbar={false}
										/>
										{linkPost.posts && (
											<>
												<Heading as="h3" size="3">
													Most popular post
												</Heading>
												<Box mt="-4">
													<PostRep
														group={linkPost.posts.map((post) => ({
															...post,
															repostActorAvatarUrl: null,
															repostActorHandle: null,
															repostActorName: null,
															repostActorUrl: null,
														}))}
														key={linkPost.posts[0].postUrl}
														instance={undefined}
														bsky={undefined}
														toolbar={false}
													/>
												</Box>
											</>
										)}
										<Separator size="4" my="7" />
									</Box>
								))}
							</Box>
						)}
					</Await>
				</Suspense>
			</Layout>
		</>
	);
};

export default TopTen;
