import type { MostRecentLinkPosts } from "@sill/schema";

interface RSSLinksProps {
	links: MostRecentLinkPosts[];
	name: string | null;
	digestUrl: string;
	subscribed: string;
}

// Simple text-based functions for RSS (no JSX components)
const intro = (name: string | null) =>
	`Hello${name ? ` ${name}` : ""}, here are your top links from the past 24 hours across your social networks.`;

const linkPlug = (digestUrl: string) =>
	`View all of these links and the posts that shared them on Sill: ${digestUrl}`;

const digestOutro = (settingsUrl: string) =>
	`Feedback? Email tyler@sill.social. Want to stop getting the Daily Digest? Adjust your digest settings at ${settingsUrl}`;

const RSSLinks = ({ links, name, digestUrl, subscribed }: RSSLinksProps) => {
	const today = new Intl.DateTimeFormat("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date());

	if (links.length === 0) {
		return `
			<article>
				<h1>Oops, no links!</h1>
				<p>
					It looks like Sill doesn't have any links for you. This is likely
					because Sill got out of sync with your Bluesky and/or Mastodon
					accounts. To address this, 
					<a href="https://sill.social/settings?tab=connect">log back into Sill</a>.
					You may be redirected to Bluesky or Mastodon to reauthorize Sill.
				</p>
				<p>
					If this doesn't work for you, please email 
					<a href="mailto:tyler@sill.social">tyler@sill.social</a>.
				</p>
				<p>${digestOutro("https://sill.social/digest/settings")}</p>
			</article>
		`;
	}

	const linksHtml = links.map((linkPost, i) => {
		const link = linkPost.link;
		if (!link?.url) return "";

		return `
			<div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #eee;">
				<h2><a href="${link.url}">${link.title || link.url}</a></h2>
				${link.description ? `<p style="color: #666;">${link.description}</p>` : ""}
				<p style="font-size: 12px; color: #999;">
					Shared by ${linkPost.posts?.length || 0} ${(linkPost.posts?.length || 0) === 1 ? "person" : "people"}
				</p>
				${link.siteName ? `<p style="font-size: 12px; color: #999;">From: ${link.siteName}</p>` : ""}
			</div>
		`;
	}).join("");

	return `
		<article>
			<h1>${today}</h1>
			<p>${intro(name)}</p>
			${subscribed === "trial" ? `
				<p>
					You are on a free trial of Sill+. 
					<a href="https://sill.social/settings/subscription">Subscribe now</a> 
					to maintain access.
				</p>
			` : ""}
			<p>${linkPlug(digestUrl)}</p>
			<hr />
			${linksHtml}
			<p><a href="https://sill.social/links">See all links on Sill</a></p>
			<p>${digestOutro("https://sill.social/digest/settings")}</p>
		</article>
	`;
};

export default RSSLinks;