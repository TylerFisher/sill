// app/routes/_index.tsx
import type { Route } from "./+types/_index";
import { Box, Container } from "@radix-ui/themes";
import MainHero from "~/components/marketing/MainHero";
import HeroAnimation from "~/components/marketing/HeroAnimation";
import Features from "~/components/marketing/Features";
import Pricing from "~/components/marketing/Pricing";
import WhySill from "~/components/marketing/WhySill";
import MarketingFooter from "~/components/marketing/MarketingFooter";
import { requireAnonymous } from "~/utils/auth.server";

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Your network. Your news. Your way." },
	{
		name: "description",
		content:
			"Sill watches your Bluesky and Mastodon feeds to surface the most valuable links being shared by your network. Stay informed without the endless scroll.",
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
			<Container size="4">
				<HeroAnimation />
				<WhySill />
				<Features />
				<Pricing />
			</Container>
			<MarketingFooter />
		</Box>
	);
};

export default Index;
