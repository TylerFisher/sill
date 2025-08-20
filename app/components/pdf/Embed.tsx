import { Root, Pages, Page, CanvasLayer, TextLayer } from "@anaralabs/lector";
import { useState } from "react";
import PageNavigationButtons from "./Navigation";
import ZoomControls from "./Zoom";

interface PDFEmbedProps {
	url: URL;
}

const PDFEmbed = ({ url }: PDFEmbedProps) => {
	const [error, setError] = useState<string | null>(null);

	if (error) {
		return (
			<div
				style={{
					width: "100%",
					height: "600px",
					backgroundColor: "var(--accent-1)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexDirection: "column",
					padding: "2rem",
					textAlign: "center",
				}}
			>
				<div style={{ marginBottom: "1rem", fontSize: "1.2rem", fontWeight: "500" }}>
					Failed to load PDF
				</div>
				<div style={{ color: "var(--gray-11)", marginBottom: "1rem" }}>
					{error}
				</div>
				<button
					type="button"
					onClick={() => {
						setError(null);
						// Force re-render by changing the key
						window.location.reload();
					}}
					style={{
						padding: "0.5rem 1rem",
						backgroundColor: "var(--accent-9)",
						color: "white",
						border: "none",
						borderRadius: "4px",
						cursor: "pointer",
					}}
				>
					Retry
				</button>
			</div>
		);
	}

	return (
		<div style={{ position: "relative" }}>
			<Root
				source={`https://proxy.corsfix.com/?url=${encodeURIComponent(url.href)}`}
				style={{
					width: "100%",
					height: "600px",
					backgroundColor: "var(--accent-1)",
				}}
				isZoomFitWidth={true}
			>
				<ZoomControls />
				<Pages
					style={{
						width: "100%",
						maxWidth: "600px",
					}}
				>
					<Page>
						<CanvasLayer />
						<TextLayer />
					</Page>
				</Pages>
				<PageNavigationButtons />
			</Root>
		</div>
	);
};

export default PDFEmbed;