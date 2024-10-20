import type { SandboxedJob } from "bullmq";
import { getBlueskyTimeline } from "~/utils/bluesky.server";

interface BlueskyFetchQueueJob {
	userId: string;
}

module.exports = async (job: SandboxedJob<BlueskyFetchQueueJob>) => {
	await getBlueskyTimeline(job.data.userId);
};
