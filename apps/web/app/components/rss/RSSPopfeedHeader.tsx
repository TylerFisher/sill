import type { MostRecentLinkPosts } from "@sill/schema";
import { workTypeYearLine } from "~/utils/popfeed";

/**
 * Popfeed review header for the web-served RSS renderers: a vertical poster
 * beside "{credit} / {title} / {type} • {year}" — matching the web feed's poster
 * card. A side-by-side table renders reliably across RSS readers.
 */
const RSSPopfeedHeader = ({
	link,
}: {
	link: NonNullable<MostRecentLinkPosts["link"]>;
}) => {
	const credit = link.authors?.filter(Boolean).join(", ") || null;
	const typeYear = workTypeYearLine(link.workType, link.publishedDate);
	return (
		<table>
			<tbody>
				<tr>
					{link.imageUrl && (
						<td style={{ width: "100px", verticalAlign: "top" }}>
							<a href={link.url}>
								<img
									src={link.imageUrl}
									alt=""
									style={{ width: "100px", display: "block" }}
								/>
							</a>
						</td>
					)}
					<td style={{ verticalAlign: "top", paddingLeft: "12px" }}>
						{credit && (
							<p style={{ margin: 0, fontSize: "12px", color: "#999" }}>
								{credit}
							</p>
						)}
						<h3 style={{ margin: "2px 0" }}>
							<a href={link.url}>{link.title || link.url}</a>
						</h3>
						{typeYear && (
							<p style={{ margin: 0, fontSize: "12px", color: "#999" }}>
								{typeYear}
							</p>
						)}
					</td>
				</tr>
			</tbody>
		</table>
	);
};

export default RSSPopfeedHeader;
