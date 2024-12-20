import type { Route } from "./+types/topten";
import { eq } from "drizzle-orm";
import Layout from "~/components/nav/Layout";
import { db } from "~/drizzle/db.server";
import { user } from "~/drizzle/schema.server";
import { getUserId } from "~/utils/auth.server";
import { networkTopTen } from "~/utils/links.server";
import LinkRep from "~/components/linkPosts/LinkRep";
import { useLayout } from "./resources/layout-switch";
import { Box, Heading, Text } from "@radix-ui/themes";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await getUserId(request);
	let existingUser: typeof user.$inferSelect | undefined = undefined;
	if (userId) {
		existingUser = await db.query.user.findFirst({
			where: eq(user.id, userId),
		});
	}

	const topTen = await networkTopTen();

	return {
		existingUser,
		topTen,
	};
};

const TopTen = ({ loaderData }: Route.ComponentProps) => {
	const { existingUser, topTen } = loaderData;
	const layout = useLayout();

	return (
		<Layout hideNav={!existingUser}>
			<Heading as="h2" mb="4">
				Top Ten Links
			</Heading>
			{topTen.map((linkPost) => (
				<Box mb="9" key={linkPost.link?.id}>
					<LinkRep
						link={linkPost.link}
						instance={undefined}
						bsky={undefined}
						layout={layout}
					/>
				</Box>
			))}
		</Layout>
	);
};

export default TopTen;
