import {
	json,
	type LoaderFunctionArgs,
	type MetaFunction,
} from "@vercel/remix";
import { Box } from "@radix-ui/themes";
import { requireAnonymous } from "~/utils/auth.server";
import Hero from "~/components/marketing/Hero";

export const meta: MetaFunction = () => [{ title: "Sill" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
	await requireAnonymous(request);
	return json({});
};

const Index = () => {
	return (
		<Box px="4">
			<Hero />
		</Box>
	);
};

export default Index;
