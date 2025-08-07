import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
const links = new Hono();
// Example route that could use shared utilities in the future
links.get('/', (c) => {
    return c.json({
        message: 'Links list endpoint',
        data: [],
        count: 0
    });
});
links.get('/trending', (c) => {
    return c.json({
        message: 'Trending links endpoint',
        data: [],
        count: 0
    });
});
// Example with validation
links.get('/:id', zValidator('param', z.object({
    id: z.string().uuid()
})), (c) => {
    const { id } = c.req.valid('param');
    return c.json({
        message: `Link ${id} endpoint`,
        data: null
    });
});
export { links };
