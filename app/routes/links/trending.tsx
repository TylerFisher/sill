import type { Route } from "./+types/trending";
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
	Callout,
	Flex,
	Heading,
	Link,
	Select,
	Separator,
	Spinner,
	Text,
} from "@radix-ui/themes";
import { Await, NavLink, useSearchParams } from "react-router";
import { Suspense, useState } from "react";
import PostRep from "~/components/linkPosts/PostRep";
import NumberRanking from "~/components/linkPosts/NumberRanking";
import { TrendingUp } from "lucide-react";

export const meta: Route.MetaFunction = () => [{ title: "Sill | Trending" }];

export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await getUserId(request);
	let existingUser: typeof user.$inferSelect | undefined = undefined;
	if (userId) {
		existingUser = await db.query.user.findFirst({
			where: eq(user.id, userId),
		});
	}

	const topTen = networkTopTen();

	return {
		existingUser,
		topTen,
	};
};

const TopTen = ({ loaderData }: Route.ComponentProps) => {
	const { existingUser, topTen } = loaderData;
	const layout = useLayout();

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
					<Heading as="h2">Trending links</Heading>
				</Flex>

				<Callout.Root my="4">
					<Callout.Icon>
						<TrendingUp />
					</Callout.Icon>
					<Callout.Text>
						Trending is a list of the most popular links on Sill right now. Sill
						calculates popularity by looking at the number of accounts who have
						posted a link on Bluesky or Mastodon. Read more{" "}
						<Link href="https://docs.sill.social">here</Link>.
					</Callout.Text>
				</Callout.Root>

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
										<NumberRanking ranking={index + 1} layout={layout} />
										{linkPost.link && (
											<LinkRep
												link={{
													...linkPost.link,
													url: linkPost.link.giftUrl || linkPost.link.url,
												}}
												instance={undefined}
												bsky={undefined}
												layout={layout}
												toolbar={false}
											/>
										)}

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
