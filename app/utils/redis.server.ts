import { Redis } from "@upstash/redis";

export const getUserCacheKey = async (userId: string) => `${userId}-link-count`;

export const connection = () => {
	const redisUrl = process.env.REDIS_URL;
	if (redisUrl == null) throw new Error("REDIS_URL must be defined");
	const connect = Redis.fromEnv();
	return connect;
};
