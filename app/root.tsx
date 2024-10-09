import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
} from "@remix-run/react";
import { json } from "@remix-run/node";
import type React from "react";
import "~/styles/reset.css";
import "@radix-ui/themes/styles.css";
import "~/styles/override.css";
import { Theme } from "@radix-ui/themes";
import { honeypot } from "~/utils/honeypot.server";
import { HoneypotProvider } from "remix-utils/honeypot/react";

export async function loader() {
	// more code here
	return json({ honeypotInputProps: honeypot.getInputProps() });
}

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body>
				<Theme
					accentColor="yellow"
					appearance="dark"
					grayColor="slate"
					radius="full"
				>
					<main className="container">{children}</main>
				</Theme>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	const { honeypotInputProps } = useLoaderData<typeof loader>();
	return (
		<HoneypotProvider {...honeypotInputProps}>
			<Outlet />
		</HoneypotProvider>
	);
}
