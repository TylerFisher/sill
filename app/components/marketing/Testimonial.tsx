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
			name: "Ben Collins",
			title: "CEO, Global Tetrahedron",
			avatarUrl:
				"https://cdn.bsky.app/img/avatar/plain/did:plc:x4qyokjtdzgl7gmqhsw4ajqj/bafkreihfnahgxywmhcl4fffsa65tk4edrio5bjyy3s3yabr6caymiyl73a@jpeg",
			workUrl: "https://bsky.app/profile/bencollins.bsky.social",
		},
		text: "Holy shit I am so excited about this. And it works!!!",
	},
	{
		author: {
			name: "Miriam Posner",
			title: "Asst. Prof., UCLA Information Studies",
			avatarUrl:
				"https://cdn.bsky.app/img/avatar/plain/did:plc:rzn6yramffebefeitqifiqqz/bafkreihr4rpkzrgqpaol6pwut645x4yj3ol2n3qselivt2glfy6jcjw7mi@jpeg",
			workUrl: "https://www.miriamposner.com/",
		},
		text: "I feel like people are not sufficiently appreciating one of the better things about Bluesky’s API, which is the resurrection of sites that can list the most-posted links by people you follow.",
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
