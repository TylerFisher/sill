import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "./schema.server.js";
export const db = drizzle(process.env.DATABASE_URL!, { schema });
await migrate(db, { migrationsFolder: "/app/app/drizzle" });
