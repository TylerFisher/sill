import { invariantResponse } from "@epic-web/invariant";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/drizzle/db.server";
import Layout from "~/components/Layout";
import { eq } from "drizzle-orm";
import { user } from "~/drizzle/schema.server";
import { Box, Heading } from "@radix-ui/themes";
import { useLoaderData } from "@remix-run/react";
import { DataList } from "@radix-ui/themes";

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request);
	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
	});
	invariantResponse(existingUser, "User not found", { status: 404 });
	return json({ user: existingUser });
}

export default function EditUserProfile() {
	const data = useLoaderData<typeof loader>();
	return (
		<Layout>
			<Box>
				<Heading as="h2" mb="2">
					Account
				</Heading>
				<DataList.Root>
					<DataList.Item align="center">
						<DataList.Label>Username</DataList.Label>
						<DataList.Value>{data.user.username}</DataList.Value>
					</DataList.Item>
					<DataList.Item align="center">
						<DataList.Label>Email</DataList.Label>
						<DataList.Value>{data.user.email}</DataList.Value>
					</DataList.Item>
					<DataList.Item align="center">
						<DataList.Label>Signed up on</DataList.Label>
						<DataList.Value>{data.user.createdAt}</DataList.Value>
					</DataList.Item>
				</DataList.Root>
			</Box>
		</Layout>
	);
}
