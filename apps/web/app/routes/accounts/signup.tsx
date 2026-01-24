import {
	Box,
	Flex,
	Heading,
	Link as RLink,
	Separator,
	Text,
} from "@radix-ui/themes";
import { Link, useSearchParams } from "react-router";
import BlueskyAuthForm from "~/components/forms/BlueskyAuthForm";
import MastodonAuthForm from "~/components/forms/MastodonAuthForm";
import Layout from "~/components/nav/Layout";
import type { Route } from "./+types/signup";
import { requireAnonymousFromContext } from "~/utils/context.server";

export const meta: Route.MetaFunction = () => [{ title: "Sill | Sign up" }];

export async function loader({ context }: Route.LoaderArgs) {
	await requireAnonymousFromContext(context);
	return {};
}

const UserSetup = () => {
	const [searchParams] = useSearchParams();

	return (
		<Layout hideNav>
			<Box mb="5">
				<Heading size="8">Sign up</Heading>
			</Box>

			{/* Bluesky Signup */}
			<BlueskyAuthForm mode="signup" searchParams={searchParams} />

			<Flex align="center" gap="3" mb="4" mt="4">
				<Separator style={{ flex: 1 }} />
				<Text size="2" color="gray">
					or
				</Text>
				<Separator style={{ flex: 1 }} />
			</Flex>

			{/* Mastodon Signup */}
			<MastodonAuthForm mode="signup" searchParams={searchParams} />

			<Box mt="5">
				<Text size="2">Already have an account? </Text>
				<RLink asChild>
					<Link to="/accounts/login">
						<Text size="2">Log in</Text>
					</Link>
				</RLink>
				.
			</Box>
		</Layout>
	);
};

export default UserSetup;
