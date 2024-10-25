import { Redis } from "ioredis";

export const connection = () => {
	const redisUrl = process.env.REDIS_URL;
	if (redisUrl == null) throw new Error("REDIS_URL must be defined");
	const connect = new Redis(redisUrl, {
		maxRetriesPerRequest: null,
	});
	return connect;
};
