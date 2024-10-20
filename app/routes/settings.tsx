import { invariantResponse } from "@epic-web/invariant";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLocation } from "@remix-run/react";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/drizzle/db.server";
import { useUser } from "~/utils/user";
import Layout from "~/components/Layout";
import { Box, Link as RadixLink, Grid, Heading } from "@radix-ui/themes";
import { eq } from "drizzle-orm";
import { user } from "~/drizzle/schema.server";

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request);
	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
		columns: { username: true },
	});
	invariantResponse(existingUser, "User not found", { status: 404 });
	return json({});
}

export default function EditUserProfile() {
	const user = useUser();
	const { pathname } = useLocation();

	return (
		<Box ml="4">
			<Grid columns="minmax(10px, 1fr) minmax(10px, 3fr)" gap="4">
				<Box
					width="100%"
					style={{
						backgroundColor: "var(--accent-1)",
						boxShadow: "var(--base-card-surface-box-shadow)",
						borderRadius: "1em",
						height: "100vh",
					}}
					p="4"
				>
					<Heading as="h4" size="3" mb="4">
						Settings for {user.name} ({user.username})
					</Heading>
					<ul
						style={{
							listStyle: "none",
							padding: 0,
							display: "flex",
							flexDirection: "column",
							gap: "0.25rem",
						}}
					>
						<li>
							<RadixLink
								asChild
								weight={pathname === "/settings/connect" ? "bold" : "regular"}
							>
								<Link to="./connect">Connect accounts</Link>
							</RadixLink>
						</li>
						<li>
							<RadixLink
								asChild
								weight={
									pathname === "/settings/change-email" ? "bold" : "regular"
								}
							>
								<Link to="./change-email">Change email address</Link>
							</RadixLink>
						</li>
						<li>
							<RadixLink
								asChild
								weight={pathname === "/settings/password" ? "bold" : "regular"}
							>
								<Link to="./password">Change password</Link>
							</RadixLink>
						</li>
						<li>
							<RadixLink
								asChild
								weight={pathname === "/settings/mute" ? "bold" : "regular"}
							>
								<Link to="./password">Mute phrases</Link>
							</RadixLink>
						</li>
						<li>
							<RadixLink
								asChild
								weight={
									pathname.startsWith("/settings/two-factor")
										? "bold"
										: "regular"
								}
							>
								<Link to="./two-factor">Setup two-factor authentication</Link>
							</RadixLink>
						</li>
					</ul>
				</Box>
				<Box gridColumn="2/3" width="66%">
					<Layout>
						<Outlet />
					</Layout>
				</Box>
			</Grid>
		</Box>
	);
}
