import { type LoaderFunctionArgs, data } from "@remix-run/node";
import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
} from "@remix-run/react";
import type React from "react";
import "~/styles/reset.css";
import "@radix-ui/themes/styles.css";
import "~/styles/override.css";
import { Theme as RadixTheme } from "@radix-ui/themes";
import { HoneypotProvider } from "remix-utils/honeypot/react";
import { honeypot } from "~/utils/honeypot.server";
import { useTheme } from "./routes/resources.theme-switch";
import { ClientHintCheck, getHints } from "./utils/client-hints";
import { getDomainUrl } from "./utils/misc";
import { useNonce } from "./utils/nonce-provider";
import { type Theme, getTheme } from "./utils/theme.server";

export async function loader({ request }: LoaderFunctionArgs) {
	const honeyProps = honeypot.getInputProps();

	return data({
		requestInfo: {
			hints: getHints(request),
			origin: getDomainUrl(request),
			path: new URL(request.url).pathname,
			userPrefs: {
				theme: getTheme(request),
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
				<link
					rel="apple-touch-icon"
					sizes="180x180"
					href="/apple-touch-icon.png"
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
					sizes="16x16"
					href="/favicon-16x16.png"
				/>
				<link rel="manifest" href="/site.webmanifest" />
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
