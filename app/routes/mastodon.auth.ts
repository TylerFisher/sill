import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7-js";
import { db } from "~/drizzle/db.server";
import { mastodonInstance } from "~/drizzle/schema.server";
import { getAuthorizationUrl } from "~/utils/mastodon.server";
import { createInstanceCookie } from "~/utils/session.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const requestUrl = new URL(request.url);
	const instance = requestUrl.searchParams.get("instance");

	if (!instance) {
		return null;
	}

	// If someone entered their full handle, get the instance from it
	let correctedInstance = instance.toLocaleLowerCase();
	if (instance.includes("@")) {
		correctedInstance = instance.split("@").at(-1) as string;
	}
	if (instance.includes("/")) {
		correctedInstance = instance.split("/")[0];
	}

	let instanceData = await db.query.mastodonInstance.findFirst({
		where: eq(mastodonInstance.instance, correctedInstance),
	});
	if (!instanceData) {
		try {
			const response = await fetch(`https://${correctedInstance}/api/v1/apps`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					client_name: "Sill",
					redirect_uris: process.env.MASTODON_REDIRECT_URI,
					scopes: "read",
				}),
			});
			const data = await response.json();

			const insert = await db
				.insert(mastodonInstance)
				.values({
					id: uuidv7(),
					instance: correctedInstance,
					clientId: data.client_id,
					clientSecret: data.client_secret,
				})
				.returning({
					id: mastodonInstance.id,
					instance: mastodonInstance.instance,
					clientId: mastodonInstance.clientId,
					clientSecret: mastodonInstance.clientSecret,
					createdAt: mastodonInstance.createdAt,
				});

			instanceData = insert[0];
		} catch (error) {
			console.error(error);
			requestUrl.searchParams.set("error", "instance");
			return redirect(requestUrl.toString());
		}
	}

	const authorizationUrl = getAuthorizationUrl(
		correctedInstance,
		instanceData.clientId,
	);
	return await createInstanceCookie(
		request,
		correctedInstance,
		authorizationUrl,
	);
};
