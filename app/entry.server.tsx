import { type EntryContext, handleRequest } from "@vercel/remix";
import { RemixServer } from "@remix-run/react";

export const streamTimeout = 10_000;
const ABORT_DELAY = 15_000;

export default async function (
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	remixContext: EntryContext,
) {
	const remixServer = (
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
