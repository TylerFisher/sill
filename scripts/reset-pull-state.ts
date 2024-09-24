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

	console.log("Finished");
};

removeCursors();
