import esbuild from "esbuild";
import pkg from "../package.json";

const external = [
	...Object.keys(pkg.dependencies || {}),
	...Object.keys(pkg.devDependencies || {}),
];

// Entry points bundled to plain JS so they run with `node` in the production
// image (tsx is a build-time-only devDependency, pruned from the final stage).
const entries: { in: string; out: string }[] = [
	{ in: "./src/process-queue.tsx", out: "./build/worker.js" },
	// One-off AppView backfill (see migrate-appview-backfill.ts). Run in prod via
	// `node build/migrate-appview-backfill.js` with the worker's env.
	{
		in: "./src/migrate-appview-backfill.ts",
		out: "./build/migrate-appview-backfill.js",
	},
	// One-off re-seed for Mastodon-only accounts whose cursor froze at the
	// AppView cutover (see reseed-mastodon-cursors.ts). Run in prod via
	// `node build/reseed-mastodon-cursors.js` with the worker's env.
	{
		in: "./src/reseed-mastodon-cursors.ts",
		out: "./build/reseed-mastodon-cursors.js",
	},
];

Promise.all(
	entries.map((entry) =>
		esbuild.build({
			entryPoints: [entry.in],
			platform: "node",
			outfile: entry.out,
			format: "esm",
			bundle: true,
			external,
		}),
	),
).catch((error) => {
	console.error(error);
	process.exit(1);
});
