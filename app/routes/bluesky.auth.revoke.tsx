import { type ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { prisma } from "~/db.server"; // Adjust based on your project structure
import { requireUserId } from "~/session.server"; // Adjust based on your session setup

export const action = async ({ request }: ActionFunctionArgs) => {
	const userId = await requireUserId(request);

	if (!userId) {
		throw new Error("User not authenticated.");
	}

	// Fetch the user's tokens
	await prisma.blueskyAccount.deleteMany({
		where: { userId: userId },
	});

	return redirect("/connect");
};
