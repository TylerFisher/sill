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
			name: "Tyler Fisher",
			title: "Founder, Sill",
			avatarUrl:
				"https://cdn.bsky.app/img/avatar/plain/did:plc:2hgmrwevidwsxundvejdeam5/bafkreif6l4drnpsj5fq3enmww4qarzhxkvj52sc4wzdc353ejqz3v5zfzu@jpeg",
			workUrl: "https://bsky.app/profile/tylerjfisher.com",
		},
		text: "Sill has reformed my relationship to social media. Instead of doomscrolling for the latest news, I have a calmer space to read news, while still getting the benefits of my network.",
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
		text: "Sill’s a major source of information for me in Chicago Public Square, and for the content that I share with people on Bluesky because—ideally—I’m following people who are smarter than I am. And I’m able then to share the news from people who are smarter than I am with my readers and followers.",
	},
	{
		author: {
			name: "Anuj Ahooja",
			title: "CEO & Executive Director, A New Social",
			avatarUrl:
				"https://cdn.bsky.app/img/avatar/plain/did:plc:qvzuhns2asyclcnvcgh3lgbx/bafkreiggxmzguiblzbvsfpf44nhtvchlptauxf4uh2uaej5agc7zag3g24@jpeg",
			workUrl: "https://bsky.app/profile/quillmatiq.com",
		},
		text: "Sill may be my favorite social web tool right now. What an incredible resource for someone that primarily uses social media to collect links and see what discussions are sparking around them.",
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
