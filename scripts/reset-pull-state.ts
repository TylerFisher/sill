import { prisma } from "~/db.server";

const removeCursors = async () => {
	await prisma.blueskyAccount.updateMany({
		where: {},
		data: {
			mostRecentPostDate: null,
		},
	});

	await prisma.mastodonAccount.updateMany({
		where: {},
		data: {
			mostRecentPostId: null,
		},
	});

	await prisma.linkPost.deleteMany({
		where: {},
	});

	await prisma.actor.deleteMany({
		where: {},
	});

	await prisma.link.deleteMany({
		where: {},
	});

	console.log("Finished");
};

removeCursors();
