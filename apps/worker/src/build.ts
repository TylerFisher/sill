import esbuild from "esbuild";
import pkg from "../package.json";

esbuild
	.build({
		entryPoints: ["./src/process-queue.tsx"],
		platform: "node",
		outfile: "./build/worker.js",
		format: "esm",
		bundle: true,
		external: [
			...Object.keys(pkg.dependencies || {}),
			...Object.keys(pkg.devDependencies || {}),
		],
	})
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
