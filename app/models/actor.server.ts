import { exportJwk, generateCryptoKeyPair } from "@fedify/fedify";
import { Actor, ActorType, Visibility } from "@prisma/client";
import { JsonObject } from "@prisma/client/runtime/library";
import { uuidv7 } from "uuidv7-js";
import federation from "../../federation";
import { prisma } from "../db.server";

export interface ActorFormData {
	username: string;
	name: string;
	bio: string;
	protected: boolean;
	language: string;
	visibility: string;
	userId: string;
}

export const createActor = async (
	request: Request,
	actorData: ActorFormData,
) => {
	const fedCtx = federation.createContext(request, undefined);
	const rsaKeyPair = await generateCryptoKeyPair("RSASSA-PKCS1-v1_5");
	const ed25519KeyPair = await generateCryptoKeyPair("Ed25519");

	let visibility: Visibility = Visibility.public;

	if (actorData.visibility === "private") {
		visibility = Visibility.private;
	} else if (actorData.visibility === "unlisted") {
		visibility = Visibility.unlisted;
	} else if (actorData.visibility === "direct") {
		visibility = Visibility.direct;
	}

	return prisma.actor.create({
		data: {
			id: uuidv7(),
			iri: fedCtx.getActorUri(actorData.username).href,
			type: ActorType.Person,
			name: actorData.name,
			handle: actorData.username,
			bioHtml: actorData.bio,
			url: fedCtx.getActorUri(actorData.username).href,
			protected: actorData.protected,
			inboxUrl: fedCtx.getInboxUri(actorData.username).href,
			followersUrl: fedCtx.getFollowersUri(actorData.username).href,
			sharedInboxUrl: fedCtx.getInboxUri().href,
			published: new Date(),
			visibility: visibility,
			userId: actorData.userId,
			actorKeys: {
				create: {
					rsaPrivateKeyJWK: (await exportJwk(
						rsaKeyPair.privateKey,
					)) as JsonObject,
					rsaPublicKeyJWK: (await exportJwk(
						rsaKeyPair.publicKey,
					)) as JsonObject,
					ed25519PrivateKeyJWK: (await exportJwk(
						ed25519KeyPair.privateKey,
					)) as JsonObject,
					ed25519PublicKeyJWK: (await exportJwk(
						ed25519KeyPair.publicKey,
					)) as JsonObject,
				},
			},
		},
	});
};

export const getActor = async (actorId: string) => {
	return await prisma.actor.findFirstOrThrow({
		where: {
			id: actorId,
		},
		include: {
			posts: true,
		},
	});
};
