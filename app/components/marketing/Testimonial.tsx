import {
	Avatar,
	Box,
	Card,
	Container,
	Flex,
	Grid,
	Heading,
	Link,
	Text,
} from "@radix-ui/themes";

export interface Testimonial {
	author: {
		name: string;
		title: string;
		avatarUrl: string;
		workUrl: string;
	};
	text: string;
}

interface TestimonialCardProps {
	testimonial: Testimonial;
}

export const testimonials: Testimonial[] = [
	{
		author: {
			name: "Nieman Lab",
			title: "Sarah Scire",
			avatarUrl:
				"https://s2.googleusercontent.com/s2/favicons?domain_url=https://niemanlab.org&sz=128",
			workUrl:
				"https://www.niemanlab.org/2024/11/remember-nuzzel-a-similar-news-aggregating-tool-now-exists-for-bluesky/",
		},
		text: "Sill already can act as a time-saver that’ll let you keep up with your network without being glued to social media.",
	},
	{
		author: {
			name: "Six Colors",
			title: "Jason Snell",
			avatarUrl:
				"https://s2.googleusercontent.com/s2/favicons?domain_url=https://sixcolors.com&sz=128",
			workUrl:
				"https://sixcolors.com/link/2024/11/sill-gives-a-nuzzel-vibe-to-mastodon-and-bluesky-links/",
		},
		text: "Sill gives a Nuzzel vibe to Mastodon and Bluesky links ... It's extremely promising.",
	},
	{
		author: {
			name: "Lifehacker",
			title: "Pranay Parab",
			avatarUrl:
				"https://s2.googleusercontent.com/s2/favicons?domain_url=https://lifehacker.com&sz=128",
			workUrl:
				"https://lifehacker.com/tech/sill-app-links-in-bluesky-mastodon-feeds",
		},
		text: "Sill Is the Best Way to Read Bluesky and Mastodon Links",
	},
	{
		author: {
			name: "Nick Tsergas",
			title: "Editor, Canada Healthwatch",
			avatarUrl: "/marketing/testimonials/nick.jpg",
			workUrl: "https://bsky.app/profile/nicktsergas.ca",
		},
		text: "Sill is a secret weapon for news discovery. I use it to help source and aggregate the most relevant health news from my Bluesky and Mastodon networks, making sure our audience gets timely updates on the most interesting stories.",
	},
	{
		author: {
			name: "TechCrunch",
			title: "Sarah Perez",
			avatarUrl:
				"https://s2.googleusercontent.com/s2/favicons?domain_url=https://techcrunch.com&sz=128",
			workUrl:
				"https://techcrunch.com/2024/11/25/sills-new-app-rounds-up-the-best-links-from-your-bluesky-and-mastodon-network/",
		},
		text: "Want to keep up with what everyone’s talking about on alternative social media sites like Bluesky and Mastodon, but don’t have time to constantly scroll through their respective apps? A newly launched link aggregation service called Sill may be able to help.",
	},
	{
		author: {
			name: "Charlie Meyerson",
			title:
				"Publisher of the award-winning daily email news briefing Chicago Public Square",
			avatarUrl: "/marketing/testimonials/charlie.jpg",
			workUrl:
				"https://www.chicagopublicsquare.com/2021/10/the-best-roundup-newsletter-in-chicago.html",
		},
		text: "Sill is a major source of information for me in Chicago Public Square, and for the content that I share with people on Bluesky because—ideally—I’m following people who are smarter than I am.",
	},
];

export const TestimonialCard = ({ testimonial }: TestimonialCardProps) => (
	<Card size="3">
		<Flex direction="column" gap="4" justify="between" height="100%">
			<Text as="p">&ldquo;{testimonial.text}&rdquo;</Text>

			<Flex gap="3" align="center">
				<Avatar
					src={testimonial.author.avatarUrl}
					alt={testimonial.author.name}
					fallback={testimonial.author.name[0]}
				/>

				<Flex direction="column">
					<Text weight="bold">
						<Link
							href={testimonial.author.workUrl}
							target="_blank"
							rel="noopener noreferrer"
						>
							{testimonial.author.name}
						</Link>
					</Text>
					<Text size="2" color="gray">
						{testimonial.author.title}
					</Text>
				</Flex>
			</Flex>
		</Flex>
	</Card>
);

export const TestimonialSection = () => (
	<Box py="9">
		<Container>
			<Heading size="8" align="center" mb="8">
				What People Are Saying
			</Heading>

			<Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="4">
				{testimonials.map((testimonial) => (
					<TestimonialCard
						key={testimonial.author.name}
						testimonial={testimonial}
					/>
				))}
			</Grid>
		</Container>
	</Box>
);
