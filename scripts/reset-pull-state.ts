import { db } from "~/drizzle/db.server";
import {
	actor,
	blueskyAccount,
	link,
	linkPost,
	linkPostToUser,
	mastodonAccount,
	post,
	postImage,
} from "~/drizzle/schema.server";

const removeCursors = async () => {
	try {
		console.log("Starting database operations...");

		await db.update(blueskyAccount).set({
			mostRecentPostDate: null,
		});
		console.log("Updated blueskyAccount");

		await db.update(mastodonAccount).set({
			mostRecentPostId: null,
		});
		console.log("Updated mastodonAccount");

		await db.delete(linkPostToUser);
		console.log("Deleted linkPostToUser");

		await db.delete(linkPost);
		console.log("Deleted linkPost");

		await db.delete(postImage);
		console.log("Deleted postImage");

		await db.delete(post);
		console.log("Deleted post");

		await db.delete(actor);
		console.log("Deleted actor");

		await db.delete(link);
		console.log("Deleted link");

		console.log("Finished");
	} catch (error) {
		console.error("Error occurred:", error);
	}
};

removeCursors();
