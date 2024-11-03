import { Box } from "@radix-ui/themes";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import Hero from "~/components/marketing/Hero";
import { requireAnonymous } from "~/utils/auth.server";

export const meta: MetaFunction = () => [{ title: "Sill" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
	await requireAnonymous(request);
	return {};
};

const Index = () => {
	return (
		<Box px="4">
			<Hero />
		</Box>
	);
};

export default Index;
