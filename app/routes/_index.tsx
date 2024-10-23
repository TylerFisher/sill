import {
	type LoaderFunctionArgs,
	type MetaFunction,
	json,
} from "@remix-run/node";
import {
	Box,
	Container,
	Flex,
	Grid,
	Heading,
	IconButton,
	Link,
	Text,
} from "@radix-ui/themes";
import { requireAnonymous } from "~/utils/auth.server";
import Hero from "~/components/marketing/Hero";
import Feature from "~/components/marketing/Feature";
import { desc } from "drizzle-orm";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import Footer from "~/components/Footer";

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
