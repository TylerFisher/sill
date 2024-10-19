import type { SandboxedJob } from "bullmq";
import { getMastodonTimeline } from "~/models/links.server";

interface MastodonFetchQueueJob {
	userId: string;
}

module.exports = async (job: SandboxedJob<MastodonFetchQueueJob>) => {
	await getMastodonTimeline(job.data.userId);
};
