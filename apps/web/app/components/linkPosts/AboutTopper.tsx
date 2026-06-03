import {
	Avatar,
	Box,
	Card,
	Flex,
	Heading,
	Inset,
	Link,
	Separator,
	Strong,
	Text,
} from "@radix-ui/themes";
import type { AboutCard } from "@sill/schema";
import styles from "./PostContent.module.css";

type Account = NonNullable<AboutCard["account"]>;

const n = (value: number) => value.toLocaleString();

/**
 * One sentence summarizing how the author's/publication's links have circulated
 * in the viewer's network — replaces a stat block that read like the profile's
 * own metrics. Frames the numbers as "their links, shared by your network".
 */
const NetworkSummary = ({
	about,
	timeLabel,
}: {
	about: AboutCard;
	timeLabel: string;
}) => {
	const { articleCount, shareCount, sharerCount } = about;
	const name = about.account?.displayName || about.name;
	const window = timeLabel === "1 day" ? "day" : timeLabel;

	if (sharerCount === 0) {
		return (
			<Text as="p" size="2" color="gray">
				No links by {name} have spread through your network over the last{" "}
				{window}.
			</Text>
		);
	}

	return (
		<Text as="p" size="2" color="gray">
			<Strong>
				{n(articleCount)} {articleCount === 1 ? "link" : "links"}
			</Strong>{" "}
			by {name} {articleCount === 1 ? "was" : "were"} shared{" "}
			<Strong>
				{n(shareCount)} {shareCount === 1 ? "time" : "times"}
			</Strong>{" "}
			by{" "}
			<Strong>
				{n(sharerCount)} {sharerCount === 1 ? "person" : "people"}
			</Strong>{" "}
			in your network over the last {window}.
		</Text>
	);
};

/**
 * Profile-card header, rendered when the AppView matched a Bluesky `account`:
 * banner + avatar (overlapping it) + display name/handle linking to the profile
 * + bio — a real social profile rather than a scraped publication summary.
 */
const ProfileHeader = ({
	account,
	fallbackName,
}: {
	account: Account;
	fallbackName: string;
}) => {
	const profileUrl = `https://bsky.app/profile/${account.did}`;
	const name = account.displayName || fallbackName;

	return (
		<>
			{account.bannerUrl && (
				<Inset side="top" clip="border-box">
					<img
						src={account.bannerUrl}
						alt=""
						style={{
							display: "block",
							width: "100%",
							aspectRatio: "3 / 1",
							objectFit: "cover",
							backgroundColor: "var(--gray-3)",
						}}
					/>
				</Inset>
			)}

			<Box mt={account.bannerUrl ? "-6" : "0"}>
				<Avatar
					size="6"
					radius="full"
					src={account.avatarUrl || undefined}
					fallback={(name || "?").charAt(0)}
					style={{ boxShadow: "0 0 0 4px var(--color-panel-solid)" }}
				/>
			</Box>

			<Heading as="h2" size="6" mt="2" style={{ lineHeight: 1.1 }}>
				<Link
					href={profileUrl}
					target="_blank"
					rel="noreferrer"
					underline="hover"
				>
					{name}
				</Link>
			</Heading>

			{account.handle && (
				<Box>
					<Link
						href={profileUrl}
						target="_blank"
						rel="noreferrer"
						size="2"
						color="gray"
					>
						@{account.handle}
					</Link>
				</Box>
			)}

			{account.description && (
				// Server-serialized HTML (link/mention facets resolved); render it
				// with new-tab anchors, matching PostContent's link handling.
				<Text
					as="p"
					size="2"
					mt="2"
					className={styles["post-content"]}
					// Default (un-muted) text color — sets the bio apart from the muted
					// network summary below. We avoid the Radix `color` prop entirely:
					// `color` remaps the accent scale, which would turn the
					// `.post-content a` links gray instead of the accent.
					style={{ textWrap: "pretty" }}
					dangerouslySetInnerHTML={{
						__html: account.description.replace(
							/<a href/g,
							'<a target="_blank" rel="noopener noreferrer" href',
						),
					}}
				/>
			)}
		</>
	);
};

/** Scraped publication/author summary header — used when there's no matched account. */
const SummaryHeader = ({ about }: { about: AboutCard }) => (
	<>
		<Flex gap="3" align="center">
			{about.faviconUrl && (
				<Avatar
					size="3"
					src={about.faviconUrl}
					radius="medium"
					fallback={(about.name || "?").charAt(0)}
				/>
			)}
			<Heading as="h2" size="6" style={{ lineHeight: 1.1 }}>
				{about.name}
			</Heading>
		</Flex>

		{about.description && (
			<Text as="p" size="2" color="gray" mt="2" style={{ textWrap: "pretty" }}>
				{about.description}
			</Text>
		)}
	</>
);

/**
 * Header card for the by-author / by-publication pages. When the AppView
 * resolved a Bluesky `account` for the publication/journalist, the header is a
 * profile card (banner + avatar + handle + bio); otherwise it's the scraped
 * publication/author summary. Below it sits the scoped activity stat row.
 */
const AboutTopper = ({
	about,
	timeLabel,
}: {
	about: AboutCard;
	kind: "author" | "domain";
	timeLabel: string;
}) => {
	return (
		<Card mb="5" size="2">
			{about.account ? (
				<ProfileHeader account={about.account} fallbackName={about.name} />
			) : (
				<SummaryHeader about={about} />
			)}

			{/* A rule separates Sill's "links in your network" stat from the
			    profile bio above it (they're otherwise the same gray prose). */}
			<Separator size="4" my="4" />
			<NetworkSummary about={about} timeLabel={timeLabel} />
		</Card>
	);
};

export default AboutTopper;
