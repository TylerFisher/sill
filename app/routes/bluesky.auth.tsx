import { type ActionFunctionArgs, redirect } from "@remix-run/node";
import { AtpAgent } from "@atproto/api";
import { prisma } from "~/db.server";
import { uuidv7 } from "uuidv7-js";
import { requireUserId } from "~/utils/auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
	const userId = await requireUserId(request);
	const data = await request.formData();
	const handle = String(data.get("handle"));
	const password = String(data.get("password"));

	const agent = new AtpAgent({
		service: "https://bsky.social",
	});

	await agent.login({
		identifier: handle,
		password,
	});

	if (!userId || !agent.session) {
		return null;
	}

	await prisma.blueskyAccount.upsert({
		where: {
			handle: agent.session.handle,
			did: agent.session.did,
		},
		create: {
			id: uuidv7(),
			handle: agent.session.handle,
			did: agent.session.did,
			service: agent.serviceUrl.href,
			refreshJwt: agent.session.refreshJwt,
			accessJwt: agent.session.accessJwt,
			email: agent.session.email,
			emailConfirmed: agent.session.emailConfirmed,
			emailAuthFactor: agent.session.emailAuthFactor,
			userId,
			active: true,
		},
		update: {
			service: agent.serviceUrl.href,
			refreshJwt: agent.session.refreshJwt,
			accessJwt: agent.session.accessJwt,
			email: agent.session.email,
			emailConfirmed: agent.session.emailConfirmed,
			emailAuthFactor: agent.session.emailAuthFactor,
		},
	});

	return redirect("/settings/connect");
};
