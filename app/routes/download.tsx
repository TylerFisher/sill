import { Box, Button, Spinner, Text } from "@radix-ui/themes";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { Await, Link, useLoaderData } from "@remix-run/react";
import { Suspense } from "react";
import Layout from "~/components/nav/Layout";
import { requireUserId } from "~/utils/auth.server";
import { filterLinkOccurrences } from "~/utils/links.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);
	const params = new URL(request.url).searchParams;
	const service = params.get("service");

	const promise = filterLinkOccurrences({ userId, fetch: true })
		.then(() => ({ promise: "success" }))
		.catch(() => ({ promise: "error" }));

	return { promise, service };
};

const Download = () => {
	const { promise, service } = useLoaderData<typeof loader>();

	return (
		<Layout hideNav>
			<Suspense
				fallback={
					<Box>
						<Text as="p" mb="4">
							Downloading the last 24 hours from your {service} timeline. This
							may take a minute.
						</Text>
						<Spinner size="3" />
					</Box>
				}
			>
				<Await
					resolve={promise}
					errorElement={
						<Box>
							<Text as="p" mb="4">
								Failed to download your timeline. Please try again later.
							</Text>
							<Link to="/connect">
								<Button>Connect more accounts</Button>
							</Link>
						</Box>
					}
				>
					{({ promise }) => {
						return (
							<Box>
								<Text as="p" mb="4">
									Successfully downloaded your timeline. We will keep your
									account updated in the background going forward.
								</Text>
								<Link to="/connect">
									<Button mr="4">Connect more accounts</Button>
								</Link>
								<Link to="/links">
									<Button>View your links</Button>
								</Link>
							</Box>
						);
					}}
				</Await>
			</Suspense>
		</Layout>
	);
};

export default Download;
