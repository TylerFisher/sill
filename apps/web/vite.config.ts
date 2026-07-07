/// <reference types="vitest" />
import { reactRouter } from "@react-router/dev/vite";
import react from "@vitejs/plugin-react";
import { type Plugin, defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Dev-only request logger. Surfaces incoming requests (e.g. from the iOS
 * simulator hitting loaders and resource routes like /bluesky/auth) in the
 * terminal, matching the morgan-style line react-router-serve emits in
 * production. `configureServer` only runs under `vite dev`, so this is a no-op
 * for builds and tests.
 */
const requestLogger = (): Plugin => ({
	name: "sill-request-logger",
	configureServer(server) {
		server.middlewares.use((req, res, next) => {
			const url = req.url ?? "";
			// Skip Vite internals, HMR pings, and static asset noise.
			if (
				url.startsWith("/@") ||
				url.startsWith("/node_modules/") ||
				url.startsWith("/__") ||
				/\.(css|m?js|map|ico|png|jpe?g|svg|gif|woff2?)($|\?)/.test(url)
			) {
				return next();
			}
			// Report sessionId cookie presence/count so it's obvious whether the
			// request carried a session (and whether a stale duplicate is riding
			// along). Values are not printed.
			const sessionIds = (req.headers.cookie ?? "")
				.split(";")
				.map((c) => c.trim())
				.filter((c) => c.startsWith("sessionId="));
			const nonEmpty = sessionIds.filter(
				(c) => c.slice("sessionId=".length).length > 0,
			).length;
			const cookieTag =
				sessionIds.length === 0
					? "no sessionId"
					: `sessionId×${sessionIds.length}${nonEmpty < sessionIds.length ? " (some empty)" : ""}`;
			const start = performance.now();
			res.once("finish", () => {
				const ms = (performance.now() - start).toFixed(1);
				console.log(
					`${req.method} ${url} ${res.statusCode} - ${ms} ms [${cookieTag}]`,
				);
			});
			next();
		});
	},
});

export default defineConfig({
	build: {
		target: "esnext",
	},
	plugins: [
		requestLogger(),
		!process.env.VITEST ? reactRouter() : react(),
		tsconfigPaths(),
	],
	server: {
		port: 3000,
	},
	ssr: {
		target: "node",
		noExternal: [/react-tweet.*/],
		external: ["@duckdb/node-bindings", "@duckdb/node-api"],
	},
	assetsInclude: ["**/*.node"],
	optimizeDeps: {
		exclude: ["@duckdb/node-bindings", "@duckdb/node-api"],
	},
	test: {
		environment: "happy-dom",
		// Additionally, this is to load ".env.test" during vitest
		env: loadEnv("test", process.cwd(), ""),
	},
});
