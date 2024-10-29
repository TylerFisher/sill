import type { Processor } from "bullmq";
import { QueueEvents } from "bullmq";
import { Queue, Worker } from "bullmq";
import { fetchLinkMetadata } from "~/utils/bluesky.server";
import { filterLinkOccurrences } from "./links.server";

type AugmentedQueue<T> = Queue<T> & {
	events: QueueEvents;
};
type RegisteredQueue = {
	queue: Queue;
	queueEvents: QueueEvents;
	worker: Worker;
};

const redis = {
	host: process.env.UPSTASH_REDIS_REST_URL,
	port: 6379,
	password: process.env.UPSTASH_REDIS_REST_TOKEN,
	tls: {},
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
		const queue = new Queue(name, {
			connection: redis,
		});
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

interface BlueskyFetchQueueJob {
	data: {
		userId: string;
	};
}

export const blueskyFetchQueue = registerQueue(
	"bluesky",
	async (job: BlueskyFetchQueueJob) => {
		await filterLinkOccurrences({ userId: job.data.userId });
	},
);

interface MastodonFetchQueueJob {
	data: {
		userId: string;
	};
}

export const mastodonFetchQueue = registerQueue(
	"mastodon",
	async (job: MastodonFetchQueueJob) => {
		await filterLinkOccurrences({ userId: job.data.userId });
	},
);
