/// <reference types="vitest" />
import { vitePlugin as remix } from "@remix-run/dev";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { vercelPreset } from "@vercel/remix/vite";

declare module "@vercel/remix" {
	interface Future {
		v3_singleFetch: true;
	}
}

export default defineConfig({
	build: {
		target: "esnext",
	},
	plugins: [
		!process.env.VITEST
			? remix({
					future: {
						v3_fetcherPersist: true,
						v3_relativeSplatPath: true,
						v3_throwAbortReason: true,
					},
					// presets: [vercelPreset()],
				})
			: react(),
		tsconfigPaths(),
	],
	server: {
		port: 3000,
	},
	test: {
		environment: "happy-dom",
		// Additionally, this is to load ".env.test" during vitest
		env: loadEnv("test", process.cwd(), ""),
	},
});
