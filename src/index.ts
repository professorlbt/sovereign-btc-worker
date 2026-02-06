import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { HTTPException } from 'hono/http-exception';
import { Env, JwtPayload } from './types';
import auth from './auth';
import applications from './applications';
import admin from './admin';
import { adminHtml } from './adminUi';

// Initialize Hono
const app = new Hono<{ Bindings: Env, Variables: { jwtPayload: JwtPayload } }>();

// 1. Global CORS Middleware
app.use('*', cors({
  origin: (origin) => {
    // Allow local development and production
    if (!origin) return 'https://sovereign-btc.pages.dev';
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin;
    if (origin.endsWith('sovereign-btc.pages.dev')) return origin;
    return 'https://sovereign-btc.pages.dev';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// 2. Rate Limiting Middleware
app.use('*', async (c, next) => {
  if (!c.env.RATE_LIMITS) return next();
  
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const key = `rate_limit:${ip}`;
  
  let countStr = await c.env.RATE_LIMITS.get(key);
  let count = countStr ? parseInt(countStr) : 0;

  if (count > 100) {
    return c.json({ success: false, error: 'Too Many Requests' }, 429);
  }

  // Increment without waiting
  c.executionCtx.waitUntil(c.env.RATE_LIMITS.put(key, (count + 1).toString(), { expirationTtl: 60 }));
  await next();
});

// 3. Health Check
app.get('/', (c) => c.text('Sovereign BTC API v1.0'));
app.get('/health', async (c) => {
  try {
    await c.env.DB.prepare('SELECT 1').first();
    return c.json({ status: 'ok', db: 'connected', environment: c.env.ENVIRONMENT });
  } catch (e) {
    return c.json({ status: 'degraded', db: 'error' }, 503);
  }
});

// 4. Serve Admin Dashboard
app.get('/admin/dashboard', (c) => c.html(adminHtml));

// 5. Protected Routes Middleware setup
// We apply strict JWT middleware for /admin/* except login and dashboard
app.use('/admin/*', async (c, next) => {
  const path = c.req.path;
  if (path === '/admin/login' || path === '/admin/dashboard') {
    return next();
  }
  
  const jwtMiddleware = jwt({ secret: c.env.ADMIN_JWT_SECRET, alg: 'HS256' });
  await jwtMiddleware(c, next);
  
  // Post-JWT Role Check
  const payload = c.get('jwtPayload');
  if (payload.role !== 'admin') {
     throw new HTTPException(403, { message: 'Forbidden: Admin access required' });
  }
});

// User protected routes
app.use('/applications/*', async (c, next) => {
    const jwtMiddleware = jwt({ secret: c.env.ADMIN_JWT_SECRET, alg: 'HS256' });
    return jwtMiddleware(c, next);
});

// 6. Mount Modules
app.route('/auth', auth);
app.route('/applications', applications);
app.route('/admin', admin);

// 7. Error Handling
app.onError((err, c) => {
  console.error(`[Error] ${c.req.method} ${c.req.url}:`, err);
  if (err instanceof HTTPException) {
    return c.json({ success: false, error: err.message }, err.status);
  }
  return c.json({ success: false, error: 'Internal Server Error' }, 500);
});

app.notFound((c) => {
  return c.json({ success: false, error: 'Not Found', help: 'Check /admin/dashboard for access.' }, 404);
});

export default app;