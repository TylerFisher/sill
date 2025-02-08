import type { Route } from "./+types/stripe-webhook";
import { stripe, syncStripeDataToDb } from "~/utils/stripe.server";
import type Stripe from "stripe";

export const ROUTE_PATH = "/api/stripe-webhook" as const;

/**
 * Gets and constructs a Stripe event signature.
 *
 * @throws An error if Stripe signature is missing or if event construction fails.
 * @returns The Stripe event object.
 */
const getStripeEvent = async (request: Request) => {
	if (!process.env.STRIPE_WEBHOOK_ENDPOINT) {
		throw new Error("No STRIPE_WEBHOOK_ENDPOINT provided");
	}

	try {
		const signature = request.headers.get("Stripe-Signature");
		if (!signature) throw new Error("Stripe signature missing");
		const payload = await request.text();
		const event = stripe.webhooks.constructEvent(
			payload,
			signature,
			process.env.STRIPE_WEBHOOK_ENDPOINT,
		);
		return event;
	} catch (err: unknown) {
		console.log(err);
		throw new Error("Failed to construct Stripe event");
	}
};

const allowedEvents: Stripe.Event.Type[] = [
	"checkout.session.completed",
	"customer.subscription.created",
	"customer.subscription.updated",
	"customer.subscription.deleted",
	"customer.subscription.paused",
	"customer.subscription.resumed",
	"customer.subscription.pending_update_applied",
	"customer.subscription.pending_update_expired",
	"customer.subscription.trial_will_end",
	"invoice.paid",
	"invoice.payment_failed",
	"invoice.payment_action_required",
	"invoice.upcoming",
	"invoice.marked_uncollectible",
	"invoice.payment_succeeded",
	"payment_intent.succeeded",
	"payment_intent.payment_failed",
	"payment_intent.canceled",
];

export const action = async ({ request }: Route.ActionArgs) => {
	const event = await getStripeEvent(request);

	if (!allowedEvents.includes(event.type)) {
		console.log("Event not allowed", event.type);
		return Response.json({ success: false });
	}

	const { customer: customerId } = event?.data?.object as {
		customer: string;
	};

	if (typeof customerId !== "string") {
		throw new Error(`ID isn't string. Event type: ${event.type}`);
	}

	console.log("Processing event", event.type, customerId);
	const subData = await syncStripeDataToDb(customerId);
	return subData;
};
