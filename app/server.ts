import { createRequestHandler } from "@remix-run/express";
import type { ServerBuild } from "@remix-run/node";
import express from "express";
import morgan from "morgan";

import { oauthRouter } from "./server/oauth/route";

const viteDevServer =
	process.env.NODE_ENV === "production" || !!process.env.E2E
		? null
		: await import("vite").then((vite) =>
				vite.createServer({
					server: { middlewareMode: true },
				}),
			);

const app = express();

app.use(
	morgan("combined", {
		skip: (req) => {
			return (
				req.get("User-Agent") === "Consul Health Check" ||
				req.hostname === "localhost" ||
				req.ip === "127.0.0.1"
			);
		},
	}),
);

app.use(
	viteDevServer ? viteDevServer.middlewares : express.static("build/client"),
);

app.use((req, res, next) => {
	if (req.hostname === "127.0.0.1") {
		res.redirect(new URL(req.originalUrl, process.env.PUBLIC_URL).toString());
	} else {
		next();
	}
});

app.use(oauthRouter);

const build = viteDevServer
	? () =>
			viteDevServer.ssrLoadModule(
				"virtual:remix/server-build",
			) as Promise<ServerBuild>
	: ((await import("../build/server/index.js")) as ServerBuild);
// @ts-ignore:
app.all("*", createRequestHandler({ build }));

app.listen(3000, "0.0.0.0", () => {
	console.info(`App listening on ${process.env.PUBLIC_URL}`);
});
