// app/routes/_index.tsx
import type { Route } from "./+types/_index";
import { Box, Container } from "@radix-ui/themes";
import MainHero from "~/components/marketing/MainHero";
import HeroAnimation from "~/components/marketing/HeroAnimation";
import Features from "~/components/marketing/Features";
import Pricing from "~/components/marketing/Pricing";
import { TestimonialSection } from "../components/marketing/Testimonial";
import MarketingFooter from "~/components/marketing/MarketingFooter";
import { requireAnonymous } from "~/utils/auth.server";

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Top news shared by the people you trust" },
	{
		name: "description",
		content:
			"Sill watches your Bluesky and Mastodon feeds to find the most popular links from your network.",
	},
];

export const loader = async ({ request }: Route.LoaderArgs) => {
	await requireAnonymous(request);
	return {};
};

const Index = () => {
	return (
		<Box
			style={{
				backgroundColor: "var(--accent-1)",
			}}
		>
			<MainHero />
			<Container size="4" px="4">
				<HeroAnimation />
				<Features />
				<TestimonialSection />
				<Pricing />
			</Container>
			<MarketingFooter />
		</Box>
	);
};

export default Index;
