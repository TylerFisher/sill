import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { login, signup, deleteSession, getUserIdFromSession } from '../auth/auth.server.js';
const auth = new Hono();
const LoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    remember: z.boolean().optional().default(false),
    redirectTo: z.string().optional(),
});
const SignupSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(1, 'Name is required'),
});
// POST /api/auth/login
auth.post('/login', zValidator('json', LoginSchema), async (c) => {
    const { email, password, remember, redirectTo } = c.req.valid('json');
    try {
        const session = await login({ email, password });
        if (!session) {
            return c.json({
                error: 'Invalid email or password',
                field: 'credentials'
            }, 401);
        }
        // Set session cookie
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            ...(remember ? { expires: session.expirationDate } : {})
        };
        c.header('Set-Cookie', `sessionId=${session.id}; ${Object.entries(cookieOptions).map(([k, v]) => `${k}=${v}`).join('; ')}`);
        return c.json({
            success: true,
            session: {
                id: session.id,
                userId: session.userId,
                expirationDate: session.expirationDate,
            },
            redirectTo: redirectTo || '/links'
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});
// POST /api/auth/signup
auth.post('/signup', zValidator('json', SignupSchema), async (c) => {
    const { email, password, name } = c.req.valid('json');
    try {
        const session = await signup({
            email,
            sentPassword: password,
            name
        });
        if (!session) {
            return c.json({
                error: 'Failed to create account',
            }, 400);
        }
        // Set session cookie
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            expires: session.expirationDate
        };
        c.header('Set-Cookie', `sessionId=${session.id}; ${Object.entries(cookieOptions).map(([k, v]) => `${k}=${v}`).join('; ')}`);
        return c.json({
            success: true,
            session: {
                id: session.id,
                userId: session.userId,
                expirationDate: session.expirationDate,
            },
            redirectTo: '/links'
        });
    }
    catch (error) {
        console.error('Signup error:', error);
        // Check if it's a unique constraint error (email already exists)
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            return c.json({
                error: 'An account with this email already exists',
                field: 'email'
            }, 409);
        }
        return c.json({ error: 'Internal server error' }, 500);
    }
});
// POST /api/auth/logout
auth.post('/logout', async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);
    if (!userId) {
        return c.json({ error: 'Not authenticated' }, 401);
    }
    try {
        // Get session ID from cookie to delete it
        const sessionId = getSessionIdFromCookie(c.req.header('cookie'));
        if (sessionId) {
            await deleteSession(sessionId);
        }
        // Clear session cookie
        c.header('Set-Cookie', 'sessionId=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
        return c.json({
            success: true,
            redirectTo: '/'
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});
// GET /api/auth/me - Get current user info
auth.get('/me', async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);
    if (!userId) {
        return c.json({ error: 'Not authenticated' }, 401);
    }
    return c.json({
        userId,
        authenticated: true
    });
});
/**
 * Extracts session ID from cookie header
 */
function getSessionIdFromCookie(cookieHeader) {
    if (!cookieHeader)
        return null;
    const cookies = cookieHeader.split(';').map(c => c.trim());
    for (const cookie of cookies) {
        const [name, value] = cookie.split('=');
        if (name === 'sessionId') {
            return value;
        }
    }
    return null;
}
export { auth };
