import { useEffect, useState } from "react";
import { extractHtmlMetadata, fetchHtmlViaProxy } from "~/utils/metadata";
import type { link } from "~/drizzle/schema.server";
import type { SuccessResult } from "open-graph-scraper-lite";

type LinkMetadata = Omit<typeof link.$inferSelect, "id" | "url" | "giftUrl">;

interface UseClientMetadataProps {
	url: string;
	metadata: SuccessResult["result"] | null;
}

interface UseClientMetadataReturn {
	clientMetadata: LinkMetadata | null;
	isLoading: boolean;
	error: string | null;
}

class FetchQueue {
	private queue: Array<() => Promise<void>> = [];
	private isProcessing = false;

	async add(fetchFn: () => Promise<void>) {
		return new Promise<void>((resolve, reject) => {
			this.queue.push(async () => {
				try {
					await fetchFn();
					resolve();
				} catch (error) {
					reject(error);
				}
			});
			this.processQueue();
		});
	}

	private async processQueue() {
		if (this.isProcessing || this.queue.length === 0) {
			return;
		}

		this.isProcessing = true;

		while (this.queue.length > 0) {
			const fetchFn = this.queue.shift();
			if (fetchFn) {
				await fetchFn();
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		this.isProcessing = false;
	}
}

const globalFetchQueue = new FetchQueue();

export function useClientMetadata({
	url,
	metadata,
}: UseClientMetadataProps): UseClientMetadataReturn {
	const [clientMetadata, setClientMetadata] = useState<LinkMetadata | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (metadata) {
			return;
		}

		const fetchClientMetadata = async () => {
			setIsLoading(true);
			setError(null);

			try {
				await globalFetchQueue.add(async () => {
					const proxyUrl = `https://proxy.corsfix.com/?${url}`;
					let html = await fetchHtmlViaProxy(proxyUrl);

					if (!html) {
						html = await fetchHtmlViaProxy(url);

						if (!html) {
							return;
						}
					}

					const extractedMetadata = await extractHtmlMetadata(html);

					if (extractedMetadata) {
						setClientMetadata(extractedMetadata);
						
						// Send extracted metadata to API
						try {
							await fetch("/api/metadata/update", {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
								},
								body: JSON.stringify({
									url,
									metadata: extractedMetadata,
								}),
							});
						} catch (apiError) {
							console.error("Failed to update metadata in database:", apiError);
						}
					} else {
						setError("Could not extract metadata from HTML");
					}
				});
			} catch (err) {
				setError(err instanceof Error ? err.message : "Unknown error");
				console.error("Client metadata fetch error:", err);
			} finally {
				setIsLoading(false);
			}
		};

		fetchClientMetadata();
	}, [url, metadata]);

	return {
		clientMetadata,
		isLoading,
		error,
	};
}
