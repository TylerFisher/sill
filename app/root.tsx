import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "@remix-run/react";
import type React from "react";
import "~/styles/reset.css";
import "@radix-ui/themes/styles.css";
import "~/styles/override.css";
import { Theme } from "@radix-ui/themes";

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
				<Theme accentColor="sky" appearance="light" grayColor="slate">
					<main className="container">{children}</main>
				</Theme>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return <Outlet />;
}
