/// <reference types="vitest" />
import { reactRouter } from "@react-router/dev/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	build: {
		target: "esnext",
	},
	plugins: [!process.env.VITEST ? reactRouter() : react(), tsconfigPaths()],
	server: {
		port: 3000,
	},
	ssr: {
		target: "node",
		noExternal: [/react-tweet.*/],
	},
	test: {
		environment: "happy-dom",
		// Additionally, this is to load ".env.test" during vitest
		env: loadEnv("test", process.cwd(), ""),
	},
});
