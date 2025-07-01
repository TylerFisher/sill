import Cloudflare from "cloudflare";
import ogs from "open-graph-scraper-lite";

const cloudflare = new Cloudflare({
	apiToken: process.env.CLOUDFLARE_API_TOKEN,
});

export interface BrowserRenderOptions {
	url: string;
	timeout?: number;
}

export interface BrowserRenderResult {
	html: string;
	success: boolean;
	error?: string;
}

export async function renderPageContent(
	options: BrowserRenderOptions,
): Promise<BrowserRenderResult> {
	try {
		const { url, timeout = 30000 } = options;

		const response = await cloudflare.browserRendering.content.create({
			account_id: process.env.CLOUDFLARE_ACCOUNT_ID!,
			url,
			viewport: {
				width: 1280,
				height: 720,
			},
			actionTimeout: timeout,
			gotoOptions: {
				waitUntil: "networkidle2",
			},
			rejectResourceTypes: ["stylesheet", "image", "font", "media"],
		});

		return {
			html: response,
			success: true,
		};
	} catch (error) {
		console.error(
			"[BROWSER RENDER] Cloudflare browser rendering error:",
			error,
		);
		return {
			html: "",
			success: false,
			error: error instanceof Error ? error.message : "Unknown error occurred",
		};
	}
}

export async function extractHtmlMetadata(
	html: string,
): Promise<null | ogs.SuccessResult> {
	const metadata = await ogs({
		html,
	});

	if (metadata.error) {
		console.error("ERROR", metadata.result);
		return null;
	}
	console.log("SUCCESS", metadata.result);

	return metadata;
}
