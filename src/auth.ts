import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { Env, LoginRequest, RegisterRequest, User, JwtPayload } from './types';
import { hashPassword, verifyPassword, generateUUID } from '../utils/crypto';

const auth = new Hono<{ Bindings: Env }>();

// Register
auth.post('/register', async (c) => {
  const body = await c.req.json() as RegisterRequest;
  const { email, password, first_name, last_name } = body;

  if (!email || !password) return c.json({ success: false, error: 'Missing fields' }, 400);

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return c.json({ success: false, error: 'Email exists' }, 409);

  const id = generateUUID();
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, account_type, status, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, 'simple', 'pending', ?, ?)`
  ).bind(id, email, passwordHash, first_name || null, last_name || null, now, now).run();

  return c.json({ success: true, message: 'Registered' }, 201);
});

// Login
auth.post('/login', async (c) => {
  const { email, password } = await c.req.json() as LoginRequest;

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first() as User | undefined;

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ success: false, error: 'Invalid credentials' }, 401);
  }

  if (['suspended', 'inactive', 'rejected'].includes(user.status)) {
    return c.json({ success: false, error: 'Account not active' }, 403);
  }

  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role || 'user',
    exp: Math.floor(Date.now() / 1000) + 86400, // 24h
  };

  const token = await sign(payload, c.env.ADMIN_JWT_SECRET);
  
  // Store session
  await c.env.USERS_KV.put(`session:${user.id}`, token, { expirationTtl: 86400 });
  // Async update last login
  c.executionCtx.waitUntil(c.env.DB.prepare('UPDATE users SET last_login = ? WHERE id = ?').bind(new Date().toISOString(), user.id).run());

  return c.json({ 
    success: true, 
    data: { 
        token, 
        user: { 
            id: user.id, 
            email: user.email, 
            status: user.status, 
            account_type: user.account_type,
            platform_handle: user.platform_handle 
        } 
    } 
  });
});

export default auth;