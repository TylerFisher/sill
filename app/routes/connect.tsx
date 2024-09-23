import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { requireUserId } from "~/session.server";
import { prisma } from "~/db.server";
import { useLoaderData } from "@remix-run/react";
import { Form } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);

	let user = null;
	if (userId) {
		user = await prisma.user.findUnique({
			where: { id: userId },
			include: {
				mastodonTokens: true,
				BlueskyAccount: true,
			},
		});
	}

	return json({
		user,
	});
};

export default function Index() {
	const { user } = useLoaderData<typeof loader>();
	return (
		<div>
			{user && user.mastodonTokens.length > 0 ? (
				<div>
					<h2>Connected to Mastodon</h2>
					<p>You are successfully connected to your Mastodon account.</p>
					<p>Instance: {user.mastodonTokens[0].instance}</p>
					<Form action="/mastodon/auth/revoke" method="post">
						<button type="submit">Disconnect from Mastodon</button>
					</Form>
				</div>
			) : (
				<>
					<h1>Connect to Mastodon</h1>
					<Form action="/mastodon/auth" method="get">
						<input
							type="url"
							name="instance"
							placeholder="Enter your Mastodon instance (e.g., https://mastodon.social)"
							required
						/>
						<button type="submit">Connect to Mastodon</button>
					</Form>
				</>
			)}
			{user && user.BlueskyAccount.length > 0 ? (
				<>
					<h2>Connected to Bluesky</h2>
					<p>You are successfully connected to your Bluesky account</p>
					<p>Account: {user.BlueskyAccount[0].handle}</p>
					<Form action="/bluesky/auth/revoke" method="post">
						<button type="submit">Disconnect from Bluesky</button>
					</Form>
				</>
			) : (
				<>
					<h1>Connect to Bluesky</h1>
					<Form action="/bluesky/auth" method="POST">
						<input
							name="handle"
							placeholder="Enter your Bluesky handle (e.g., tyler.bsky.social)"
							required
						/>
						<input
							name="password"
							type="password"
							placeholder="Use an app password"
							required
						/>
						<button type="submit">Connect to Bluesky</button>
					</Form>
				</>
			)}
		</div>
	);
}
