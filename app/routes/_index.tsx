import {
	type LoaderFunctionArgs,
	type MetaFunction,
	json,
} from "@remix-run/node";
import {
	Box,
	Container,
	Flex,
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
	const features = [
		{
			title: "Stop doomscrolling",
			description:
				"Sill can send you a daily email with the day's most popular links shared by the people you follow. You can then read what matters at your own pace, when the time is right for you.",
			image: "Image here",
		},
		{
			title: "Your news, your way",
			description:
				"Leverage our powerful muting and filtering tools to ensure you only see the content you care about.",
			image: "Image here",
		},
		{
			title: "How Sill works",
			description:
				"Sill connects to your Bluesky and Mastodon accounts and collects the links shared by the people you follow. You can then filter out the noise and focus on the content that matters to you.",
			image: "Image here",
		},
	];

	return (
		<Box px="4">
			<Hero />
			<Container mt="8" size="3">
				{features.map((feature, i) => (
					<Feature
						title={feature.title}
						description={feature.description}
						image={feature.image}
						key={feature.title}
						align={i % 2 === 0 ? "left" : "right"}
					/>
				))}
				<Footer align="center" />
			</Container>
		</Box>
	);
};

export default Index;
