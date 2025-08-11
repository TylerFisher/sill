import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "./schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const db = drizzle(process.env.DATABASE_URL!, { schema });

export async function runMigrations() {
	const migrationsFolder = join(__dirname, "migrations");
	await migrate(db, { migrationsFolder });
}
