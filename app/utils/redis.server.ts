import { Redis } from "ioredis";

export const getUserCacheKey = async (userId: string) => `${userId}-link-count`;

export const connection = () => {
	const redisUrl = process.env.REDIS_URL;
	if (redisUrl == null) throw new Error("REDIS_URL must be defined");
	const connect = new Redis(redisUrl, {
		maxRetriesPerRequest: null,
		family: 6,
	});
	return connect;
};
