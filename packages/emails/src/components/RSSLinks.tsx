import type { MostRecentLinkPosts } from "@sill/schema";
import { intro, linkPlug, digestOutro } from "../utils/digestText.js";
import { truncateDescription } from "../utils/misc.js";
import { renderToString } from "react-dom/server";
import { getUniqueAvatarUrls } from "./LinkPost.js";

interface RSSLinksProps {
	links: MostRecentLinkPosts[];
	name: string | null;
	digestUrl: string;
	subscribed: string;
}

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
				<p>${digestOutro("https://sill.social/digest?tab=settings")}</p>
			</article>
		`;
	}

	const linksHtml = links
		.map((linkPost, i) => {
			const link = linkPost.link;
			if (!link?.url) return "";

			let authors = link.authors?.join(", ");

			if (link.authors && link.authors.length === 2) {
				authors = `${link.authors[0]} and ${link.authors[1]}`;
			}

			const urlHost = new URL(link.url).host;
			const displayHost = link.siteName || urlHost;

			const uniqueAvatars = getUniqueAvatarUrls(linkPost.posts);

			const displayTitle = link.title.endsWith(".pdf")
				? `PDF from ${displayHost}`
				: link.title;

			return `
			<div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #eee;">
       <h5 style="color: #999;">${displayHost}</h5>
				<h2><a href="${link.url}">${displayTitle}</a></h2>
				${link.description ? `<p style="color: #666;">${truncateDescription(link.description)}</p>` : ""}
        ${authors ? `<p style="font-size: 12px; color: #999;">by ${authors}</p>` : ""}
				<p style="font-size: 12px; color: #999;">
					Shared by ${uniqueAvatars?.length || 0} ${(uniqueAvatars?.length || 0) === 1 ? "person" : "people"}
				</p>
        <hr />
			</div>
		`;
		})
		.join("");

	return `
		<article>
			<h1>${today}</h1>
			<p>${intro(name)}</p>
			${
				subscribed === "trial"
					? `
				<p>
					You are on a free trial of Sill+. 
					<a href="https://sill.social/settings/subscription">Subscribe now</a> 
					to maintain access.
				</p>
			`
					: ""
			}
			<p>${renderToString(linkPlug(digestUrl))}</p>
			<hr />
			${linksHtml}
			<p><a href="https://sill.social/links">See all links on Sill</a></p>
			<p>${renderToString(digestOutro("https://sill.social/digest?tab=settings"))}</p>
		</article>
	`;
};

export default RSSLinks;
