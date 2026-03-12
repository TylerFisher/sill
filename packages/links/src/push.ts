import apn from "@parse/node-apn";
import { db, deviceToken } from "@sill/schema";
import { eq } from "drizzle-orm";

let provider: apn.Provider | null = null;

function getProvider(): apn.Provider | null {
	const key = process.env.APNS_KEY;
	const keyId = process.env.APNS_KEY_ID;
	const teamId = process.env.APNS_TEAM_ID;

	if (!key || !keyId || !teamId) {
		console.warn(
			"APNs not configured: missing APNS_KEY, APNS_KEY_ID, or APNS_TEAM_ID",
		);
		return null;
	}

	if (!provider) {
		provider = new apn.Provider({
			token: {
				key: Buffer.from(key, "utf8"),
				keyId,
				teamId,
			},
			production: process.env.NODE_ENV === "production",
		});
	}

	return provider;
}

interface PushPayload {
	title: string;
	body: string;
	data?: Record<string, string>;
}

export async function sendPushNotification(
	userId: string,
	payload: PushPayload,
): Promise<void> {
	const apnsProvider = getProvider();
	if (!apnsProvider) {
		console.log("Skipping push notification: APNs not configured");
		return;
	}

	const tokens = await db.query.deviceToken.findMany({
		where: eq(deviceToken.userId, userId),
	});

	if (tokens.length === 0) {
		console.log(`No device tokens found for user ${userId}`);
		return;
	}

	const bundleId = process.env.APNS_BUNDLE_ID;
	if (!bundleId) {
		console.warn("Skipping push notification: APNS_BUNDLE_ID not set");
		return;
	}

	const notification = new apn.Notification();
	notification.alert = {
		title: payload.title,
		body: payload.body,
	};
	notification.sound = "default";
	notification.topic = bundleId;

	if (payload.data) {
		notification.payload = payload.data;
	}

	const tokenStrings = tokens.map((t) => t.token);
	const result = await apnsProvider.send(notification, tokenStrings);

	// Remove stale tokens that APNs rejected as unregistered
	if (result.failed && result.failed.length > 0) {
		for (const failure of result.failed) {
			if (
				failure.response?.reason === "Unregistered" ||
				failure.response?.reason === "BadDeviceToken" ||
				failure.response?.reason === "ExpiredProviderToken"
			) {
				const staleToken = failure.device;
				console.log(`Removing stale device token: ${staleToken}`);
				await db.delete(deviceToken).where(eq(deviceToken.token, staleToken));
			}
		}
	}
}
