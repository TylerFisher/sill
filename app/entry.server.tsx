import { type EntryContext, handleRequest } from "@vercel/remix";
import { RemixServer } from "@remix-run/react";

const ABORT_DELAY = 10_000;

export default async function (
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	remixContext: EntryContext,
) {
	let remixServer = (
		<RemixServer
			abortDelay={ABORT_DELAY}
			context={remixContext}
			url={request.url}
		/>
	);
	return handleRequest(
		request,
		responseStatusCode,
		responseHeaders,
		remixServer,
	);
}
