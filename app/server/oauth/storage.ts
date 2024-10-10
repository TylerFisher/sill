import type {
	NodeSavedSession,
	NodeSavedSessionStore,
	NodeSavedState,
	NodeSavedStateStore,
} from "@atproto/oauth-client-node";

import { prisma } from "~/db.server";

export class StateStore implements NodeSavedStateStore {
	async get(key: string): Promise<NodeSavedState | undefined> {
		const authState = await prisma.atprotoAuthState.findUnique({
			where: { key },
		});
		if (!authState) return;
		return JSON.parse(authState.state) as NodeSavedState;
	}

	async set(key: string, state: NodeSavedState) {
		const data = { key, state: JSON.stringify(state) };
		await prisma.atprotoAuthState.upsert({
			where: { key },
			create: data,
			update: data,
		});
	}

	async del(key: string) {
		await prisma.atprotoAuthState.delete({
			where: { key },
		});
	}
}

export class SessionStore implements NodeSavedSessionStore {
	async get(key: string): Promise<NodeSavedSession | undefined> {
		const authSession = await prisma.atprotoAuthSession.findUnique({
			where: { key },
		});
		if (!authSession) return;
		return JSON.parse(authSession.session) as NodeSavedSession;
	}

	async set(key: string, session: NodeSavedSession) {
		const data = { key, session: JSON.stringify(session) };
		await prisma.atprotoAuthSession.upsert({
			where: { key },
			create: data,
			update: data,
		});
	}

	async del(key: string) {
		await prisma.atprotoAuthSession.delete({
			where: { key },
		});
	}
}
