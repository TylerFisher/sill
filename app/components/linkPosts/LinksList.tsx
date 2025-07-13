import { Box, Separator } from "@radix-ui/themes";
import LinkPostRep from "~/components/linkPosts/LinkPostRep";
import type { bookmark } from "~/drizzle/schema.server";
import { useLayout } from "~/routes/resources/layout-switch";
import type { SubscriptionStatus } from "~/utils/auth.server";
import type { MostRecentLinkPosts } from "~/utils/links.server";

interface LinksListProps {
	links: MostRecentLinkPosts[];
	instance: string | undefined;
	bsky: string | undefined;
	bookmarks: (typeof bookmark.$inferSelect)[];
	subscribed: SubscriptionStatus;
}

const LinksList = ({
	links,
	instance,
	bsky,
	bookmarks,
	subscribed,
}: LinksListProps) => {
	const layout = useLayout();

	return (
		<div>
			{links.map((linkPost, index) => (
				<div key={linkPost.link?.id}>
					<LinkPostRep
						linkPost={linkPost}
						instance={instance}
						bsky={bsky}
						layout={layout}
						bookmarks={bookmarks}
						subscribed={subscribed}
					/>
					{index < links.length - 1 &&
						(layout === "default" ? (
							<Separator my="7" size="4" orientation="horizontal" />
						) : (
							<Box my="5" />
						))}
				</div>
			))}
		</div>
	);
};

export default LinksList;
