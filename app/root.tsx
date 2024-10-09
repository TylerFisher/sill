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
import { makeTimings, time } from "./utils/timing.server";
import { prisma } from "./db.server";
import { logout, getUserId } from "./utils/auth.server";
import { ClientHintCheck, getHints } from "./utils/client-hints";
import { getDomainUrl } from "./utils/misc";
import { type Theme, getTheme } from "./utils/theme.server";
import { useNonce } from "./utils/nonce-provider";
import { useOptionalUser, useUser } from "./utils/user";
import { ThemeSwitch, useTheme } from "./routes/resources.theme-switch";

export async function loader({ request }: LoaderFunctionArgs) {
	const timings = makeTimings("root loader");
	const userId = await time(() => getUserId(request), {
		timings,
		type: "getUserId",
		desc: "getUserId in root",
	});

	const user = userId
		? await time(
				() =>
					prisma.user.findUniqueOrThrow({
						select: {
							id: true,
							name: true,
							username: true,
						},
						where: { id: userId },
					}),
				{ timings, type: "find user", desc: "find user in root" },
			)
		: null;
	if (userId && !user) {
		console.info("something weird happened");
		// something weird happened... The user is authenticated but we can't find
		// them in the database. Maybe they were deleted? Let's log them out.
		await logout({ request, redirectTo: "/" });
	}
	const honeyProps = honeypot.getInputProps();

	return json(
		{
			user,
			requestInfo: {
				hints: getHints(request),
				origin: getDomainUrl(request),
				path: new URL(request.url).pathname,
				userPrefs: {
					theme: getTheme(request),
				},
			},
			honeyProps,
		},
		{
			headers: { "Server-Timing": timings.toString() },
		},
	);
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
					<main>{children}</main>
				</RadixTheme>
				<ThemeSwitch />
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

function App() {
	const data = useLoaderData<typeof loader>();
	const nonce = useNonce();
	const user = useOptionalUser();
	const theme = useTheme();
	return (
		<Document nonce={nonce} theme={theme}>
			<Heading
				size="9"
				style={{
					fontWeight: 900,
					fontStyle: "italic",
					textAlign: "center",
					color: "var(--accent-11)",
					textTransform: "lowercase",
					paddingTop: "1rem",
				}}
				mb="4"
			>
				<Link
					to="/"
					style={{
						color: "inherit",
						textDecoration: "none",
					}}
				>
					Sill
				</Link>
			</Heading>
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
