import { Webhooks } from "@polar-sh/remix";

export const action = Webhooks({
	webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
	onCustomerStateChanged: async (payload) => {
		try {
			const response = await fetch(`${process.env.API_BASE_URL}/api/subscription/webhook`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				console.error("[POLAR WEBHOOK] API call failed:", response.status, response.statusText);
				const errorText = await response.text();
				console.error("[POLAR WEBHOOK] API error response:", errorText);
			} else {
				console.log("[POLAR WEBHOOK] Successfully processed webhook");
			}
		} catch (error) {
			console.error("[POLAR WEBHOOK] Error calling API:", error);
		}
	},
});
