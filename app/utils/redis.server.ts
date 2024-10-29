import { Redis } from "@upstash/redis";

export const getUserCacheKey = async (userId: string) => `${userId}-link-count`;
