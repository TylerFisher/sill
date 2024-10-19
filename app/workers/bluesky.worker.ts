import type { SandboxedJob } from "bullmq";
import { getBlueskyTimeline } from "~/models/links.server";

interface BlueskyFetchQueueJob {
	userId: string;
}

module.exports = async (job: SandboxedJob<BlueskyFetchQueueJob>) => {
	await getBlueskyTimeline(job.data.userId);
};
