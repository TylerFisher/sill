import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { runMigrations } from './database/db.server.js';
const app = new Hono();
// Middleware
app.use('*', logger());
app.use('*', cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
}));
// Health check endpoint
app.get('/health', (c) => {
    return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});
// Import route modules
import { auth } from './routes/auth.js';
import { links } from './routes/links.js';
// API routes
app.get('/api/hello', (c) => {
    return c.json({ message: 'Hello from Hono API!' });
});
// Mount route modules
app.route('/api/auth', auth);
app.route('/api/links', links);
// 404 handler
app.notFound((c) => {
    return c.json({ error: 'Not found' }, 404);
});
// Error handler
app.onError((err, c) => {
    console.error(`${err}`);
    return c.json({ error: 'Internal Server Error' }, 500);
});
const port = Number.parseInt(process.env.API_PORT || '3001', 10);
console.log(`🚀 Hono API server starting on port ${port}`);
// Run migrations before starting server
try {
    await runMigrations();
    console.log('✅ Database migrations completed');
}
catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
}
serve({
    fetch: app.fetch,
    port,
});
