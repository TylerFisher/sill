interface CacheReport {
	handle: string;
	hits: number;
	misses: number;
}

const cacheStats = new Map<string, CacheReport>();

export const recordCacheHit = (handle: string) => {
	const entry = cacheStats.get(handle) ?? { handle, hits: 0, misses: 0 };
	entry.hits++;
	cacheStats.set(handle, entry);
};

export const recordCacheMiss = (handle: string) => {
	const entry = cacheStats.get(handle) ?? { handle, hits: 0, misses: 0 };
	entry.misses++;
	cacheStats.set(handle, entry);
};

/**
 * Returns the cache report for the current batch and resets the stats.
 */
export const flushCacheReport = (): CacheReport[] => {
	const report = Array.from(cacheStats.values());
	cacheStats.clear();
	return report;
};
