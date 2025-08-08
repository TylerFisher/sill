import { hc } from "hono/client";
import type { AppType } from "@sill/api";

// Test RPC client setup
const API_BASE_URL = process.env.API_BASE_URL || "http://api:3001";

export function testRpcClient() {
	const client = hc<AppType>(API_BASE_URL);
	
	// Try to access the health endpoint to test type inference
	const healthCheck = client.health.$get;
	const apiHello = client.api.hello.$get;
	
	// Try to access auth routes - remove optional chaining to see exact error
	console.log("Health check available:", !!healthCheck);
	console.log("API hello available:", !!apiHello);
	console.log("Client API object:", Object.keys(client.api));
	console.log("Full client object keys:", Object.keys(client));
	
	return client;
}