import { Avatar, Box, Card, Flex, Heading, Link, Text } from "@radix-ui/themes";
import type { AboutCard } from "@sill/schema";

/** One labelled metric in the stat row. */
const Stat = ({ value, label }: { value: number; label: string }) => (
	<Flex direction="column" gap="1">
		<Text size="6" weight="bold" style={{ lineHeight: 1 }}>
			{value.toLocaleString()}
		</Text>
		<Text size="1" color="gray">
			{label}
		</Text>
	</Flex>
);

/**
 * Header card for the by-author / by-publication pages, built from the AppView's
 * `about` summary: the publication (favicon + name + blurb) or journalist
 * (byline), and a stat row of how much it's been shared in the viewer's network
 * over the page's window.
 *
 * `publications` differs per page, so `kind` disambiguates:
 * - by-author → the sites the byline writes for ("Writes for …").
 * - by-domain (publication view) → the host's sibling publications, rendered as
 *   a drill-down menu (each links to that publication on the same host; the
 *   current one — `about.name` — is shown active). Omitted for single-brand hosts.
 */
const AboutTopper = ({
	about,
	kind,
}: {
	about: AboutCard;
	kind: "author" | "domain";
}) => {
	const publications = about.publications ?? [];
	const writesFor = kind === "author" ? publications : [];
	const siblings = kind === "domain" ? publications : [];

	return (
		<Card mb="5" size="2">
			<Flex gap="3" align="center">
				{about.faviconUrl && (
					<Avatar
						size="3"
						src={about.faviconUrl}
						radius="medium"
						fallback={(about.name || "?").charAt(0)}
					/>
				)}
				<Heading as="h2" size="6">
					{about.name}
				</Heading>
			</Flex>

			{about.description && (
				<Text as="p" size="2" color="gray" mt="2">
					{about.description}
				</Text>
			)}

			{writesFor.length > 0 && (
				<Text as="p" size="2" color="gray" mt="2">
					Writes for {writesFor.join(", ")}
				</Text>
			)}

			{siblings.length > 1 && (
				<Flex gap="3" wrap="wrap" align="center" mt="2">
					<Text size="2" color="gray">
						Publications:
					</Text>
					{siblings.map((pub) =>
						pub === about.name ? (
							<Text key={pub} size="2" weight="bold">
								{pub}
							</Text>
						) : (
							<Link
								key={pub}
								size="2"
								href={`/links/domain/${about.query}?publication=${encodeURIComponent(
									pub,
								)}`}
							>
								{pub}
							</Link>
						),
					)}
				</Flex>
			)}

			<Box mt="4">
				<Flex gap={{ initial: "5", sm: "8" }} wrap="wrap">
					<Stat value={about.articleCount} label="Articles" />
					<Stat value={about.shareCount} label="Shares" />
					<Stat value={about.sharerCount} label="Sharers" />
				</Flex>
				<Text as="p" size="1" color="gray" mt="2">
					In your network
				</Text>
			</Box>
		</Card>
	);
};

export default AboutTopper;
