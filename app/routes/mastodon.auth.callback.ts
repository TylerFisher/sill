import { type LoaderFunctionArgs, redirect } from "@remix-run/node";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7-js";
import { db } from "~/drizzle/db.server";
import { mastodonAccount, mastodonInstance } from "~/drizzle/schema.server";
import { getUserId } from "~/utils/auth.server";
import { getAccessToken } from "~/utils/mastodon.server";
import { mastodonFetchQueue } from "~/utils/queue.server";
import { getInstanceCookie } from "~/utils/session.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const url = new URL(request.url);
	const instance = await getInstanceCookie(request);
	const code = url.searchParams.get("code");
	const userId = await getUserId(request);

	const dbInstance = await db.query.mastodonInstance.findFirst({
		where: eq(mastodonInstance.instance, instance),
	});

	if (!userId || !dbInstance || !code) {
		throw new Error("Could not retrieve instance or code");
	}

	const tokenData = await getAccessToken(
		dbInstance.instance,
		code,
		dbInstance.clientId,
		dbInstance.clientSecret,
	);

	await db.insert(mastodonAccount).values({
		id: uuidv7(),
		accessToken: tokenData.access_token,
		tokenType: tokenData.token_type,
		instanceId: dbInstance.id,
		userId: userId,
	});

	mastodonFetchQueue.add(`${userId}-mastodon-fetch`, {
		userId,
	});

	return redirect("/connect");
};
