import type { Route } from "./+types/pdf-proxy";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const url = new URL(request.url);
	const pdfUrl = url.searchParams.get("url");

	if (!pdfUrl) {
		return new Response("Missing URL parameter", { status: 400 });
	}

	let targetUrl: URL;
	try {
		targetUrl = new URL(pdfUrl);
	} catch {
		return new Response("Invalid URL", { status: 400 });
	}

	if (targetUrl.protocol !== "https:") {
		return new Response("Only HTTPS URLs are allowed", { status: 400 });
	}

	try {
		const rangeHeader = request.headers.get("range");
		const fetchHeaders: Record<string, string> = {
			"User-Agent": "Sill PDF Proxy/1.0",
		};

		if (rangeHeader) {
			fetchHeaders.Range = rangeHeader;
		}

		const response = await fetch(targetUrl.href, {
			headers: fetchHeaders,
		});

		if (!response.ok && response.status !== 206) {
			return new Response(`Failed to fetch PDF: ${response.status}`, {
				status: response.status,
			});
		}

		// For initial request (no range), validate content type and size
		if (!rangeHeader) {
			const contentType = response.headers.get("content-type");
			if (!contentType?.includes("application/pdf")) {
				return new Response("URL does not point to a PDF file", { status: 400 });
			}

			const contentLength = response.headers.get("content-length");
			if (contentLength && Number.parseInt(contentLength) > 50 * 1024 * 1024) {
				// 50MB limit
				return new Response("PDF file too large", { status: 413 });
			}
		}

		const responseHeaders: Record<string, string> = {
			"Content-Type": "application/pdf",
			"Cache-Control": "public, max-age=3600",
			"Access-Control-Allow-Origin": "*",
			"Accept-Ranges": "bytes", // Enable range requests
		};

		const headersToForward = [
			"content-length",
			"content-range",
			"last-modified",
			"etag",
		];

		for (const headerName of headersToForward) {
			const headerValue = response.headers.get(headerName);
			if (headerValue) {
				responseHeaders[headerName] = headerValue;
			}
		}

		return new Response(response.body, {
			status: response.status,
			headers: responseHeaders,
		});
	} catch (error) {
		console.error("PDF proxy error:", error);
		return new Response("Failed to fetch PDF", { status: 500 });
	}
};