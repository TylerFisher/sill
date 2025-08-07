import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import * as schema from "./schema.server.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const db = drizzle(process.env.DATABASE_URL, { schema });
await migrate(db, { migrationsFolder: __dirname });
