import { useEffect, useState } from "react";
import { useFetchers } from "react-router";
import type { MostRecentLinkPosts } from "@sill/schema";

/**
 * Optimistic muting for the feed. Muting a link/post POSTs to `/api/mute/add`
 * via a fetcher, but the server-side feed doesn't reflect the new mute until
 * the AppView preferences push lands and its cache expires (~a minute). To make
 * muting feel instant, this watches every in-flight `/api/mute/add` fetcher,
 * accumulates the submitted phrases for the session, and exposes an `isMuted`
 * predicate the feed uses to drop matching cards immediately.
 *
 * Phrases are kept (never removed) for the page's lifetime: a full reload pulls
 * a converged feed from the server, and within a session the predicate keeps
 * the card hidden across the intermediate revalidations that would otherwise
 * bring it back.
 */
export function useOptimisticMutes(): {
	isMuted: (linkPost: MostRecentLinkPosts) => boolean;
} {
	const fetchers = useFetchers();
	const [phrases, setPhrases] = useState<string[]>([]);

	useEffect(() => {
		const pending = fetchers
			.filter((f) => f.formAction?.includes("/api/mute/add") && f.formData)
			.map((f) => String(f.formData?.get("newPhrase") ?? "").trim().toLowerCase())
			.filter(Boolean);
		if (pending.length === 0) return;
		setPhrases((prev) => {
			const next = new Set(prev);
			for (const p of pending) next.add(p);
			return next.size === prev.length ? prev : [...next];
		});
	}, [fetchers]);

	const isMuted = (linkPost: MostRecentLinkPosts): boolean => {
		if (phrases.length === 0) return false;
		// Mirror the fields the mute phrases are derived from (URL + host for
		// links, post text + actor handle/name for posts) so both the narrow
		// ("this link/post") and broad ("everything from X") mutes catch.
		const haystacks: (string | null | undefined)[] = [
			linkPost.link?.url,
			linkPost.link?.title,
			linkPost.link?.description,
			...(linkPost.posts ?? []).flatMap((p) => [
				p.postText,
				p.actorHandle,
				p.actorName,
				p.repostActorHandle,
				p.repostActorName,
			]),
		];
		return phrases.some((phrase) =>
			haystacks.some((h) => h?.toLowerCase().includes(phrase)),
		);
	};

	return { isMuted };
}
