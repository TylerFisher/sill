import { db } from "~/drizzle/db.server";
import { desc, eq } from "drizzle-orm";
import type { Route } from "./+types/archive";
import { requireUserId } from "~/utils/auth.server";
import { digestItem, user } from "~/drizzle/schema.server";
import { Box, Callout } from "@radix-ui/themes";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import MonthCollapsible from "~/components/archive/MonthCollapsible";
import { CircleAlert } from "lucide-react";
import { Link } from "@radix-ui/themes";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await requireUserId(request);

	if (!userId) {
		throw new Error("User ID is required");
	}

	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
	});

	if (!existingUser) {
		throw new Response(null, {
			status: 404,
			statusText: "Not Found",
		});
	}

	const items = await db.query.digestItem.findMany({
		columns: {
			id: true,
			pubDate: true,
		},
		where: eq(digestItem.userId, userId),
		orderBy: desc(digestItem.pubDate),
	});

	// Group items by month
	const itemsByMonth = items.reduce(
		(acc, item) => {
			const date = new Date(item.pubDate);
			const monthYear = `${date.getFullYear()}-${date.getMonth()}`;

			if (!acc[monthYear]) {
				acc[monthYear] = {
					month: date.toLocaleString("default", { month: "long" }),
					year: date.getFullYear(),
					items: [],
				};
			}

			acc[monthYear].items.push(item);
			return acc;
		},
		{} as Record<string, { month: string; year: number; items: typeof items }>,
	);

	return { itemsByMonth, userId };
};

export default function Archive({ loaderData }: Route.ComponentProps) {
	const items = loaderData.itemsByMonth;

	return (
		<Layout>
			<PageHeading
				title="Daily Digest Archive"
				dek="View past editions of your Daily Digest. Click on a month to view the editions for that month."
			/>
			<Callout.Root mb="4">
				<Callout.Icon>
					<CircleAlert />
				</Callout.Icon>
				<Callout.Text>
					Looking for your Daily Digest settings?{" "}
					<Link href="/digest/settings">Click here</Link>.
				</Callout.Text>
			</Callout.Root>
			<Box>
				{Object.entries(items).map(
					([monthYear, { month, year, items }], index) => (
						<Box key={monthYear} mb="4">
							<MonthCollapsible
								month={month}
								year={year}
								items={items}
								userId={loaderData.userId}
								index={index}
							/>
						</Box>
					),
				)}
			</Box>
		</Layout>
	);
}
