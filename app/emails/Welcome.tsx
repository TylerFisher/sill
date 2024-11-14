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
				<Link href="https://sill.social/connect">here.</Link>
			</Text>

			<Heading>How Sill Works</Heading>
			<Text>
				Sill connects to your Bluesky and Mastodon accounts and watches your
				timelines for links. Over time, Sill ranks those links according to
				popularity. Popularity is determined by the number of individual
				accounts you follow that have shared a link. The more accounts you
				follow that share a link, the more popular it is.
			</Text>
			<Img
				src="https://sill.social/marketing/post-example.png"
				alt="Sill popularity ranking example"
				style={imgStyles}
			/>
			<Text>
				Sill counts both original posts and reposts in its popularity rankings.
				Thus, in the example above, this post has been reposted by 14 accounts.
				If I also follow the original poster, then this post will count as 15
				shares in the overall count of shares.
			</Text>

			<Heading>How to Use Sill</Heading>
			<Text>
				Sill will handle counting for you automatically, but you can customize
				it for your own needs as well.
			</Text>
			<Img
				src="https://sill.social/marketing/filters.png"
				alt="Sill feed filters"
				style={imgStyles}
			/>
			<Text>
				First, you can use the filters to customize your view. You can hide
				reposts, sort by popularity or date, see posts from a particular
				service, and search for specific phrases, accounts or links.
			</Text>
			<Img
				src="https://sill.social/marketing/mute.png"
				alt="Screenshot of the UI for muting users and domains"
				style={imgStyles}
			/>
			<Text>
				If you don't want to see posts from certain users or links from certain
				domains, you can mute them. Use the mute button on a link or a post to
				add domains and accounts to your mute list. You can also go to{" "}
				<Link href="https://sill.social/moderation">your mute settings</Link> to
				manage your mute list and add custom mute phrases.
			</Text>
			<Text>
				Finally, Sill can send you a daily email with the most popular links
				from your timeline. You can enable this feature{" "}
				<Link href="https://sill.social/connect">here</Link>.
			</Text>

			<Heading>Send Us Your Feedback!</Heading>
			<Text>
				We're always looking to improve Sill. If you have any feedback or
				suggestions, you can reach out to{" "}
				<Link href="mailto:tyler@sill.social">tyler@sill.social</Link>.
			</Text>
		</EmailLayout>
	);
};

const imgStyles = {
	width: "100%",
	height: "auto",
};

export default WelcomeEmail;
