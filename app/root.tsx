import {
	Link,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
} from "@remix-run/react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import type React from "react";
import "~/styles/reset.css";
import "@radix-ui/themes/styles.css";
import "~/styles/override.css";
import { Heading, Theme as RadixTheme } from "@radix-ui/themes";
import { honeypot } from "~/utils/honeypot.server";
import { HoneypotProvider } from "remix-utils/honeypot/react";
import { ClientHintCheck, getHints } from "./utils/client-hints";
import { getDomainUrl } from "./utils/misc";
import { type Theme, getTheme } from "./utils/theme.server";
import { useNonce } from "./utils/nonce-provider";
import { ThemeSwitch, useTheme } from "./routes/resources.theme-switch";

export async function loader({ request }: LoaderFunctionArgs) {
	const honeyProps = honeypot.getInputProps();

	return json({
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
				<ClientHintCheck nonce={nonce} />
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
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
				<ThemeSwitch />
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
