import { invariantResponse } from "@epic-web/invariant";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useHref } from "@remix-run/react";
import { requireUserId } from "~/utils/auth.server";
import { prisma } from "~/db.server";
import { useUser } from "~/utils/user";
import Layout from "~/components/Layout";
import { Box, Link as RadixLink, Grid } from "@radix-ui/themes";

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request);
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { username: true },
	});
	invariantResponse(user, "User not found", { status: 404 });
	return json({});
}

export default function EditUserProfile() {
	const user = useUser();
	const href = useHref();

	return (
		<>
			<Grid columns="minmax(10px, 1fr) minmax(10px, 3fr)" gap="8">
				<Box
					width="100%"
					style={{
						backgroundColor: "var(--accent-1)",
						boxShadow: "var(--base-card-surface-box-shadow)",
						borderRadius: "1em",
					}}
					p="4"
					mt="9"
					ml="4"
				>
					<ul
						style={{
							listStyle: "none",
							padding: 0,
						}}
					>
						<li>
							<RadixLink
								asChild
								weight={href === "/settings/connect" ? "bold" : "regular"}
							>
								<Link to="./connect">Connect accounts</Link>
							</RadixLink>
						</li>
						<li>
							<RadixLink
								asChild
								weight={href === "/settings/change-email" ? "bold" : "regular"}
							>
								<Link to="./change-email">Change email address</Link>
							</RadixLink>
						</li>
						<li>
							<RadixLink
								asChild
								weight={href === "/settings/password" ? "bold" : "regular"}
							>
								<Link to="./password">Change password</Link>
							</RadixLink>
						</li>
						<li>
							<RadixLink
								asChild
								weight={
									href.startsWith("/settings/two-factor") ? "bold" : "regular"
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
		</>
	);
}
