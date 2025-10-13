import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create connection pool
// Note: Using smaller pool size since multiple Node.js processes (web app + API) 
// will each create their own pool instance
const pool = new Pool({
	connectionString: process.env.DATABASE_URL!,
	max: 5, // maximum number of connections per process (reduced for multiple processes)
	idleTimeoutMillis: 30000, // close idle clients after 30 seconds
	connectionTimeoutMillis: 2000, // return an error after 2 seconds if connection could not be established
});

// Create database instance with connection pool
export const db = drizzle(pool, { schema });

export async function runMigrations() {
	const migrationsFolder = join(__dirname, "migrations");
	await migrate(db, { migrationsFolder });
}
