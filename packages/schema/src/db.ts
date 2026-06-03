import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create connection pool
// Note: Pool size is auto-calculated based on process type and UPDATE_BATCH_SIZE
// Multiple Node.js processes (web app + API + worker) will each create their own pool instance
const defaultPoolSize = 20;

// Determine if this is the worker process
// Worker needs more connections to handle parallel job processing
// Check both env var (set in docker-compose) and argv (for local dev with tsx)
const isWorker =
	process.env.PROCESS_TYPE === "worker" ||
	process.argv.some((arg) => arg.includes("process-queue"));

const batchSize = Number.parseInt(process.env.UPDATE_BATCH_SIZE || "50");
let calculatedPoolSize = defaultPoolSize;
if (isWorker) {
	// Worker pool size: Jobs spend most of their time on external API calls (Bluesky/Mastodon),
	// not holding DB connections. Each job makes ~5 quick DB queries. Connections are acquired only
	// during query execution (milliseconds) then released. However, during high concurrency, multiple
	// jobs may hit DB queries simultaneously. We use 0.25x batch size to handle peak concurrent queries.
	calculatedPoolSize = Math.max(defaultPoolSize, Math.ceil(batchSize * 0.25));
}

const poolSize = Number.parseInt(
	process.env.DATABASE_POOL_SIZE || String(calculatedPoolSize),
);

const pool = new Pool({
	connectionString: process.env.DATABASE_URL!,
	max: poolSize,
	idleTimeoutMillis: 30000, // close idle clients after 30 seconds
	connectionTimeoutMillis: 10000, // wait up to 10 seconds for a connection (increased from 2s for high concurrency)
	maxUses: 7500, // close connections after 7500 uses to prevent memory leaks
});

// Log pool configuration on startup
console.log(
	`[DB] Connection pool initialized: ${poolSize} max connections${isWorker ? ` (worker with batch size: ${batchSize})` : " (web/api)"}`,
);

// Create database instance with connection pool
export const db = drizzle(pool, { schema });

export async function runMigrations() {
	const migrationsFolder = join(__dirname, "migrations");
	await migrate(db, { migrationsFolder });
}

// Dedicated pool for advisory locks, kept separate from the app `pool` on
// purpose. An advisory lock is held for the whole duration of `fn` (e.g. an
// OAuth token refresh, which does network I/O), and `fn` itself runs queries
// against the app pool. If the lock borrowed from the app pool, many concurrent
// lock holders could occupy every app connection while their inner queries wait
// for a connection that never frees — a self-deadlock. A small separate pool
// caps concurrent lock holders and leaves the app pool untouched. Lazily
// created so non-locking processes never open it.
let lockPool: Pool | undefined;
const getLockPool = (): Pool => {
	if (!lockPool) {
		lockPool = new Pool({
			connectionString: process.env.DATABASE_URL!,
			max: Number.parseInt(process.env.ADVISORY_LOCK_POOL_SIZE || "8", 10),
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 10000,
		});
	}
	return lockPool;
};

// Folds a lock name into Postgres's signed 64-bit bigint range via FNV-1a.
// Collisions only over-serialize unrelated names, which is harmless.
const advisoryLockKey = (name: string): string => {
	let h = 0xcbf29ce484222325n;
	for (let i = 0; i < name.length; i++) {
		h = BigInt.asUintN(64, (h ^ BigInt(name.charCodeAt(i))) * 0x100000001b3n);
	}
	return BigInt.asIntN(64, h).toString();
};

/**
 * Run `fn` while holding a cross-process lock keyed by `name`: a
 * transaction-scoped Postgres advisory lock (`pg_advisory_xact_lock`) on a
 * dedicated connection. Serializes across every process that shares this
 * database; the lock releases automatically at COMMIT/ROLLBACK (and if the
 * backend dies), so a crashed process never strands it.
 *
 * It MUST be transaction-scoped, not session-scoped: Sill connects through
 * pgbouncer in `transaction` pool mode, which leases a backend per transaction.
 * A session-level `pg_advisory_lock`/`pg_advisory_unlock` pair would run on
 * different backends — the lock leaks onto one backend and later acquisitions
 * block forever. Wrapping the whole critical section in one BEGIN…COMMIT pins a
 * single backend for its duration, so the lock and its release stay together.
 * The lock is held across `fn` (a token refresh), so the transaction stays open
 * for the refresh; the dedicated pool (small) caps how many backends that pins.
 *
 * This is the cross-process primitive only. Callers that also need in-process
 * serialization should wrap their own in-memory mutex around this (the OAuth
 * client does — it must serialize *every* token read in-process but only take
 * this DB lock when a refresh is actually imminent).
 *
 * Used to serialize Bluesky OAuth token refreshes per account: refresh tokens
 * are single-use, so two processes refreshing the same account at once revoke
 * each other ("session was deleted by another process").
 */
export async function withAdvisoryLock<T>(
	name: string,
	fn: () => T | PromiseLike<T>,
): Promise<T> {
	const key = advisoryLockKey(name);
	const client = await getLockPool().connect();
	try {
		await client.query("BEGIN");
		try {
			await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [key]);
			const result = await fn();
			await client.query("COMMIT");
			return result;
		} catch (e) {
			await client.query("ROLLBACK").catch(() => {});
			throw e;
		}
	} finally {
		client.release();
	}
}
