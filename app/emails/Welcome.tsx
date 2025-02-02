import { Heading, Img, Link, Text } from "@react-email/components";
import EmailHeading from "~/components/emails/Heading";
import EmailLayout from "~/components/emails/Layout";

interface WelcomeEmailProps {
	name: string | null;
}

const WelcomeEmail = ({ name }: WelcomeEmailProps) => {
	return (
		<EmailLayout preview="Here's what you need to know to get started.">
			<EmailHeading>Welcome to Sill!</EmailHeading>
			<Text>
				Hello{name ? ` ${name}` : ""}, thanks for signing up for Sill!
				Hopefully, by now, you've connected your Bluesky and/or Mastodon
				accounts. If not, you can do that{" "}
				<Link
					href={`${import.meta.env.VITE_PUBLIC_DOMAIN}/connect`}
					style={linkStyles}
				>
					here.
				</Link>
			</Text>

			<Heading as="h2">How Sill Works</Heading>
			<Text>
				Sill connects to your Bluesky and Mastodon accounts and watches your
				timelines for links. The core function Sill serves is link aggregation:
				it counts the number of people in your social networks who shared the
				same link. Counting shares seems simple, but Sill makes a couple key
				decisions to get the best signal possible out of your networks.
			</Text>
			<Text>
				Rather than counting the raw number of posts linking to a particular
				URL, Sill counts the <em>unique accounts</em> that post a particular
				URL. Some accounts you follow may post the same link many times.
				Counting unique actors protects against one account spamming your feed.
			</Text>
			<Img
				src={`${import.meta.env.VITE_PUBLIC_DOMAIN}/marketing/post-example.png`}
				alt="Sill popularity ranking example"
				style={imgStyles}
			/>
			<Text>
				Sill counts both original posts and reposts in its popularity rankings.
				Thus, in the example above, this post has been reposted by 14 accounts.
				If I also follow the original poster, then this post will count as 15
				shares in the overall count of shares.
			</Text>

			<Heading as="h2">How to Use Sill</Heading>
			<Text>Sill offers a few different ways to filter your feed.</Text>
			<Img
				src={`${import.meta.env.VITE_PUBLIC_DOMAIN}/marketing/filters.png`}
				alt="Sill feed filters"
				style={imgStyles}
			/>
			<Text>
				On mobile, you'll find these filters by tapping the filters button at
				the bottom of your screen. On desktop, you'll find these filters on the
				right side of your screen. If you select more than one filter, those
				filters are <strong>additive</strong>. For example, if you select "Posts
				from the last 3 hours" and "Exclude reposts", Sill will only show you
				items from the last 3 hours that are not reposts.
			</Text>
			<Img
				src={`${import.meta.env.VITE_PUBLIC_DOMAIN}/marketing/mute.png`}
				alt="Screenshot of the UI for muting users and domains"
				style={imgStyles}
			/>
			<Text>
				If you don't want to see posts from certain users or links from certain
				domains, you can mute them. Use the mute button on a link or a post to
				add domains and accounts to your mute list. You can also go to{" "}
				<Link
					href={`${import.meta.env.VITE_PUBLIC_DOMAIN}/moderation`}
					style={linkStyles}
				>
					your mute settings
				</Link>{" "}
				to manage your mute list and add custom mute phrases.
			</Text>
			<Heading as="h2">Your trial of Sill+</Heading>
			<Text>
				By signing up for a new account with Sill, you've been given a free
				14-day trial of Sill+. Sill+ is a paid subscription that offers a few
				extra features:
			</Text>
			<Heading as="h4">Daily Digest</Heading>
			<Text>
				Get a daily curated email or RSS feed of the most popular links from
				your network, delivered at your preferred time.
			</Text>
			<Text>
				<Link
					href={`${import.meta.env.VITE_PUBLIC_DOMAIN}/email`}
					style={linkStyles}
				>
					Set up your Daily Digest →
				</Link>
			</Text>
			<Heading as="h4">Custom Notifications</Heading>
			<Text>
				Set up personalized email or RSS alerts for any criteria you define,
				from popularity thresholds to specific keywords.
			</Text>
			<Text>
				<Link
					href={`${import.meta.env.VITE_PUBLIC_DOMAIN}/notifications`}
					style={linkStyles}
				>
					Set up custom notifications →
				</Link>
			</Text>
			<Heading as="h4">Custom Lists & Feeds</Heading>
			<Text>
				Track links from your favorite custom lists and feeds on Bluesky or
				Mastodon.
			</Text>
			<Text>
				<Link
					href={`${import.meta.env.VITE_PUBLIC_DOMAIN}/connect`}
					style={linkStyles}
				>
					Connect your lists →
				</Link>
			</Text>
			<Text>
				A Sill+ subscription is $5/month or $50/year. You can sign up for Sill+{" "}
				<Link
					href={`${import.meta.env.VITE_PUBLIC_DOMAIN}/settings/subscription`}
					style={linkStyles}
				>
					here
				</Link>
				.
			</Text>

			<Heading as="h2">Send Us Your Feedback!</Heading>
			<Text>
				We're always looking to improve Sill. If you have any feedback or
				suggestions, you can reach out to{" "}
				<Link
					href={`mailto:${import.meta.env.VITE_ADMIN_EMAIL}`}
					style={linkStyles}
				>
					{import.meta.env.VITE_ADMIN_EMAIL}
				</Link>
				.
			</Text>
		</EmailLayout>
	);
};

const imgStyles = {
	width: "100%",
	height: "auto",
};

const linkStyles = {
	color: "#9E6C00",
	textDecoration: "none",
};

export default WelcomeEmail;
