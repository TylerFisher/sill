import { Note, lookupObject, isActor, DocumentLoader } from "@fedify/fedify";
import { Post, PostType } from "@prisma/client";
import { uuidv7 } from "uuidv7-js";
import { prisma } from "~/db.server";
import MarkdownIt from "markdown-it";
import { hashtag } from "@fedify/markdown-it-hashtag";
import { mention } from "@fedify/markdown-it-mention";
import { persistActor } from "federation/account";
import replaceLink from "markdown-it-replace-link";
import federation from "federation";

export interface FormatResult {
	html: string;
	mentions: string[];
	hashtags: string[];
	previewLink: string | null;
}

interface Env {
	hashtags: string[];
	previewLink: string | null;
	links: string[];
}

export const createPost = async (
	postBody: string,
	actorId: string,
	request: Request,
): Promise<Post> => {
	const actor = await prisma.actor.findFirstOrThrow({
		where: {
			id: actorId,
		},
		select: {
			handle: true,
			id: true,
			visibility: true,
		},
	});

	const fedCtx = federation.createContext(request, undefined);
	const fmtOpts = {
		url: fedCtx.url,
		contextLoader: fedCtx.contextLoader,
		documentLoader: await fedCtx.getDocumentLoader(actor),
	};
	const id = uuidv7();
	const url = fedCtx.getObjectUri(Note, { handle: actor.handle, id });

	const content = await formatPostBody(postBody, fmtOpts);
	const tags = Object.fromEntries(
		content.hashtags.map((tag) => [
			tag.toLowerCase(),
			new URL(`/tags/${encodeURIComponent(tag.substring(1))}`, request.url)
				.href,
		]),
	);

	const post = await prisma.post.create({
		data: {
			id: uuidv7(),
			actorId: actorId,
			content: postBody,
			contentHtml: content.html,
			type: PostType.Note,
			visibility: actor.visibility,
			iri: url.href,
			url: url.href,
			tags,
		},
	});

	if (content.mentions.length > 0) {
		await prisma.mention.createMany({
			data: content.mentions.map((m) => ({
				postId: post.id,
				actorId: actor.id,
			})),
		});
	}

	return post;
};

const formatPostBody = async (
	postBody: string,
	options: {
		url: URL | string;
		contextLoader?: DocumentLoader;
		documentLoader?: DocumentLoader;
	},
): Promise<FormatResult> => {
	const draft = new MarkdownIt({ linkify: true })
		.use(mention, {})
		.use(hashtag, {});
	const draftEnv: { mentions: string[] } = { mentions: [] };
	draft.render(postBody, draftEnv);

	const handles: Record<string, { id: string; href: string }> = {};
	const handleList =
		draftEnv.mentions.length > 0
			? await prisma.actor.findMany({
					select: {
						handle: true,
						id: true,
						url: true,
						iri: true,
					},
					where: {
						handle: {
							in: draftEnv.mentions,
						},
					},
				})
			: [];

	for (const { handle, id, url, iri } of handleList) {
		handles[handle] = { href: url ?? iri, id };
	}

	for (const mention of draftEnv.mentions) {
		if (mention in handles) continue;
		const actor = await lookupObject(mention);
		if (!isActor(actor) || actor.id == null) continue;
		const dbActor = await persistActor(actor);
		if (dbActor == null) continue;
		handles[dbActor.handle] = {
			href: dbActor.url ?? dbActor.iri,
			id: dbActor.id,
		};
	}

	const md = new MarkdownIt({ linkify: true })
		.use(mention, {
			link(handle) {
				if (handle in handles) return handles[handle].href;
				return null;
			},
			linkAttributes(handle: string) {
				return {
					"data-account-id": handles[handle].id,
					"data-account-handle": handle,
					translate: "no",
					class: "h-card u-url mention",
				};
			},
			label(handle: string) {
				const bareHandle = handle.replaceAll(/(?:^@)|(?:@[^@]+$)/g, "");
				return `@<span>${encodeURIComponent(bareHandle)}</span>`;
			},
		})
		.use(hashtag, {
			link(tag) {
				return new URL(
					`/tags/${encodeURIComponent(tag.substring(1))}`,
					options.url,
				).href;
			},
			linkAttributes(tag: string) {
				return {
					"data-tag": tag.substring(1),
					class: "mention hashtag",
					rel: "tag",
				};
			},
			label(tag: string) {
				return `#<span>${encodeURIComponent(tag.substring(1))}</span>`;
			},
		})
		// biome-ignore lint/suspicious/noExplicitAny: untyped
		.use(replaceLink as any, {
			processHTML: false,
			replaceLink(link: string, env: Env) {
				if (link.startsWith("http://") || link.startsWith("https://")) {
					env.links.push(link);
					env.previewLink = link;
					return link;
				}
				return new URL(link, new URL("/", options.url)).href;
			},
		});
	const env: Env = {
		hashtags: [],
		previewLink: null,
		links: [],
	};
	const html = md.render(postBody, env);
	return {
		html: html,
		mentions: Object.values(handles).map((v) => v.id),
		hashtags: env.hashtags,
		previewLink: env.previewLink,
	};
};
