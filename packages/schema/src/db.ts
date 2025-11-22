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

// Determine if this is the worker process by checking if it's running process-queue
// Worker needs more connections to handle parallel job processing
const isWorker = process.argv.some((arg) =>
	arg.includes("process-queue"),
);

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
