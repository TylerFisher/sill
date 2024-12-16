import type { Route } from "./+types/_index";
import { Box } from "@radix-ui/themes";
import Hero from "~/components/marketing/Hero";
import { requireAnonymous } from "~/utils/auth.server";

export const meta: Route.MetaFunction = () => [{ title: "Sill" }];

export const loader = async ({ request }: Route.LoaderArgs) => {
	await requireAnonymous(request);
	return {};
};

const Index = () => {
	return (
		<Box
			px="4"
			style={{
				backgroundColor: "var(--accent-2)",
			}}
		>
			<Hero />
		</Box>
	);
};

export default Index;
