/// <reference types="vitest" />
import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import react from "@vitejs/plugin-react";
import { devServer } from "react-router-hono-server/dev";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

installGlobals();

export default defineConfig({
	build: {
		target: "esnext",
	},
	plugins: [
		devServer(),
		!process.env.VITEST
			? remix({
					future: {
						v3_fetcherPersist: true,
						v3_relativeSplatPath: true,
						v3_throwAbortReason: true,
					},
				})
			: react(),
		tsconfigPaths(),
	],
	test: {
		environment: "happy-dom",
		// Additionally, this is to load ".env.test" during vitest
		env: loadEnv("test", process.cwd(), ""),
	},
});
