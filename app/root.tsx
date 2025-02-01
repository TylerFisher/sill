import type { Route } from "./+types/root";
import {
	data,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
} from "react-router";
import type React from "react";
import "~/styles/reset.css";
import "@radix-ui/themes/styles.css";
import "~/styles/override.css";
import { Theme as RadixTheme } from "@radix-ui/themes";
import { HoneypotProvider } from "remix-utils/honeypot/react";
import { honeypot } from "~/utils/honeypot.server";
import { useTheme } from "./routes/resources/theme-switch";
import { ClientHintCheck, getHints } from "./utils/client-hints";
import { getDomainUrl } from "./utils/misc";
import { useNonce } from "./utils/nonce-provider";
import { type Theme, getTheme } from "./utils/theme";
import { getLayout } from "./utils/layout.server";

export async function loader({ request }: Route.LoaderArgs) {
	const honeyProps = honeypot.getInputProps();

	return data({
		requestInfo: {
			hints: getHints(request),
			origin: getDomainUrl(request),
			path: new URL(request.url).pathname,
			userPrefs: {
				theme: getTheme(request),
				layout: getLayout(request),
			},
		},
		honeyProps,
	});
}

export function Document({
	children,
	nonce,
	theme = "light",
}: { children: React.ReactNode; nonce: string; theme?: Theme }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<ClientHintCheck nonce={nonce} />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta
					name="description"
					content="Sill streamlines your Bluesky and Mastodon feeds to give you a clear picture of what's happening."
				/>
				<meta name="og:title" content="Sill" />
				<meta
					name="og:description"
					content="Sill streamlines your Bluesky and Mastodon feeds to give you a clear picture of what's happening."
				/>
				<meta name="og:image" content="https://sill.social/share.png" />
				<meta name="og:image:width" content="1200" />
				<meta name="og:image:height" content="630" />
				<meta name="og:url" content="https://sill.social" />
				<meta name="og:type" content="website" />
				<meta name="og:site_name" content="Sill" />
				<link
					rel="apple-touch-icon"
					sizes="57x57"
					href="/apple-icon-57x57.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="60x60"
					href="/apple-icon-60x60.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="72x72"
					href="/apple-icon-72x72.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="76x76"
					href="/apple-icon-76x76.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="114x114"
					href="/apple-icon-114x114.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="120x120"
					href="/apple-icon-120x120.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="144x144"
					href="/apple-icon-144x144.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="152x152"
					href="/apple-icon-152x152.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="180x180"
					href="/apple-icon-180x180.png"
				/>
				<link
					rel="icon"
					type="image/png"
					sizes="192x192"
					href="/android-icon-192x192.png"
				/>
				<link
					rel="icon"
					type="image/png"
					sizes="32x32"
					href="/favicon-32x32.png"
				/>
				<link
					rel="icon"
					type="image/png"
					sizes="96x96"
					href="/favicon-96x96.png"
				/>
				<link
					rel="icon"
					type="image/png"
					sizes="16x16"
					href="/favicon-16x16.png"
				/>
				<link rel="manifest" href="/pwa-manifest.json" />
				<meta name="msapplication-TileColor" content="#14120B" />
				<meta name="msapplication-TileImage" content="/ms-icon-144x144.png" />
				<meta name="theme-color" content="#14120B" />
				<link rel="canonical" href="https://sill.social" />
				<script
					defer
					data-domain="sill.social"
					src="https://plausible.io/js/script.outbound-links.pageview-props.tagged-events.js"
				/>
				<Meta />
				<Links />
			</head>
			<body>
				<RadixTheme
					accentColor="yellow"
					appearance={theme}
					grayColor="slate"
					radius="full"
				>
					{children}
				</RadixTheme>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

function App() {
	const nonce = useNonce();
	const theme = useTheme();
	return (
		<Document nonce={nonce} theme={theme}>
			<Outlet />
		</Document>
	);
}

export default function AppWithProviders() {
	const data = useLoaderData<typeof loader>();
	return (
		<HoneypotProvider {...data.honeyProps}>
			<App />
		</HoneypotProvider>
	);
}
