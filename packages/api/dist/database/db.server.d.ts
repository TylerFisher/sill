import * as schema from "./schema.server.js";
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: import("drizzle-orm/node-postgres").NodePgClient;
};
export declare function runMigrations(): Promise<void>;
