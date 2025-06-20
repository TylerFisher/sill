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
	Card,
	Flex,
	Heading,
	Separator,
	Spinner,
	Text,
} from "@radix-ui/themes";
import { Await, NavLink } from "react-router";
import { Suspense } from "react";
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

const PromoContent = () => (
	<Flex justify="center" align="center" direction="column" gap="2">
		<Text as="p">Want to see the most popular links in your own network? </Text>
		<Flex gap="2">
			<NavLink to="/accounts/signup">
				<Button type="button" size="3">
					Sign up for Sill
				</Button>
			</NavLink>
			<NavLink to="/accounts/login">
				<Button type="button" size="3">
					Log in
				</Button>
			</NavLink>
		</Flex>
	</Flex>
);

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
					<PromoContent />
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
						calculates popularity by looking at the number of accounts Sill
						knows about who have posted a link on Bluesky or Mastodon.
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
							<Box mb={!existingUser ? "100px" : "0"}>
								{topTen.map((linkPost, index) => (
									<>
										<Card key={linkPost.link?.id}>
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
													isBookmarked={false}
												/>
											)}

											{linkPost.posts && (
												<>
													<Heading
														as="h3"
														size={layout === "dense" ? "1" : "3"}
													>
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
															layout={layout}
														/>
													</Box>
												</>
											)}
										</Card>
										{index < topTen.length - 1 && layout === "default" && (
											<Separator size="4" my="7" />
										)}

										{index < topTen.length - 1 && layout === "dense" && (
											<Box my="5" />
										)}
									</>
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
