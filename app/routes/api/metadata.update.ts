import type { ActionFunctionArgs } from "react-router";
import { eq } from "drizzle-orm";
import { db } from "~/drizzle/db.server";
import { link } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";

export async function action({ request }: ActionFunctionArgs) {
	if (request.method !== "POST") {
		throw new Response("Method not allowed", { status: 405 });
	}

	await requireUserId(request);

	try {
		const body = await request.json();
		const { url, metadata } = body;

		if (!url || !metadata) {
			return new Response(JSON.stringify({ error: "URL and metadata are required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Convert publishedDate string back to Date object if it exists
		const processedMetadata = {
			...metadata,
			publishedDate: metadata.publishedDate ? new Date(metadata.publishedDate) : null,
		};

		const result = await db
			.update(link)
			.set(processedMetadata)
			.where(eq(link.url, url))
			.returning();

		if (result.length === 0) {
			return new Response(JSON.stringify({ error: "Link not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response(JSON.stringify({ success: true, link: result[0] }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error updating link metadata:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
