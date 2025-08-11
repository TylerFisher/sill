import "dotenv/config"; // make sure to install dotenv package
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL environment variable is not set");
}

export default defineConfig({
	dialect: "postgresql",
	out: "./packages/schema/src/migrations",
	schema: "./packages/schema/src/schema.ts",
	dbCredentials: {
		url: `${databaseUrl}`,
		ssl: "allow",
	},
	// Print all statements
	verbose: true,
	// Always ask for confirmation
	strict: true,
});
