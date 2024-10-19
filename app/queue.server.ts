import type { Processor } from "bullmq";
import { QueueEvents } from "bullmq";
import { Queue, Worker } from "bullmq";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { connection } from "./redis.server";
import { fetchLinkMetadata } from "./models/links.server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const redis = connection();

type AugmentedQueue<T> = Queue<T> & {
	events: QueueEvents;
};
type RegisteredQueue = {
	queue: Queue;
	queueEvents: QueueEvents;
	worker: Worker;
};
declare global {
	var __registeredQueues: Record<string, RegisteredQueue> | undefined;
}
const registeredQueues =
	// biome-ignore lint/suspicious/noAssignInExpressions: using singleton pattern
	global.__registeredQueues || (global.__registeredQueues = {});
/**
 *
 * @param name Unique name of the queue
 * @param processor
 */
export function registerQueue<T>(
	name: string,
	processor: Processor<T> | string,
) {
	if (!registeredQueues[name]) {
		const queue = new Queue(name, { connection: redis });
		const queueEvents = new QueueEvents(name, {
			connection: redis,
		});
		const worker = new Worker<T>(name, processor, {
			connection: redis,
			lockDuration: 1000 * 60 * 15,
			concurrency: 8,
		});
		registeredQueues[name] = {
			queue,
			queueEvents,
			worker,
		};
	}
	const queue = registeredQueues[name].queue as AugmentedQueue<T>;
	queue.events = registeredQueues[name].queueEvents;
	return queue;
}

interface LinksQueueJob {
	data: {
		uri: string;
	};
}

export const linksQueue = registerQueue("links", async (job: LinksQueueJob) => {
	await fetchLinkMetadata(job.data.uri);
});

export const blueskyFetchQueue = registerQueue(
	"bluesky",
	path.join(__dirname, "./workers/bluesky.worker.ts"),
);

export const mastodonFetchQueue = registerQueue(
	"mastodon",
	path.join(__dirname, "./workers/mastodon.worker.ts"),
);
