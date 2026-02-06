import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { sign } from 'hono/jwt'
import type { 
  Env, 
  AdminLoginRequest, 
  AdminApproveRequest, 
  AdminRejectRequest,
  AdminUpgradeRequest,
  AdminDowngradeRequest,
  AdminUpdateUserRequest,
  AdminSuspendRequest,
  AdminActivateRequest,
  AdminEmailRequest,
  AdminBulkActionRequest,
  AdminExportRequest,
  User,
  JwtPayload
} from './types'
import { verifyPassword } from '../utils/crypto'

const admin = new Hono<{ Bindings: Env; Variables: { jwtPayload: JwtPayload } }>()

// Helper for CSV conversion
const convertToCSV = (data: any[]): string => {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
};

/* =========================================================
   Admin Login (Public)
   ========================================================= */
admin.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json<AdminLoginRequest>();

    if (!email || !password) {
      throw new HTTPException(400, { message: 'Missing email or password' });
    }

    // Strictly validate admin email
    if (email.toLowerCase() !== 'admin@sovereign.btc') {
      // Fake verify to prevent timing attacks
      await verifyPassword(password, '$2a$10$fakehashforsecuritypurposesonly');
      throw new HTTPException(403, { message: 'Invalid credentials' });
    }

    const hash = c.env.ADMIN_PASSWORD_HASH;
    if (!hash || !c.env.ADMIN_JWT_SECRET) {
        throw new HTTPException(500, { message: 'Server configuration error' });
    }

    const valid = await verifyPassword(password, hash);
    if (!valid) {
      throw new HTTPException(403, { message: 'Invalid credentials' });
    }

    // Create JWT token using Hono's sign for compatibility
    const now = Math.floor(Date.now() / 1000);
    const payload: JwtPayload = {
      email: email.toLowerCase(),
      role: 'admin',
      exp: now + (8 * 60 * 60), // 8 hours
    };
    
    const token = await sign(payload, c.env.ADMIN_JWT_SECRET);

    return c.json({
      success: true,
      message: 'Admin login successful',
      data: { token, expiresIn: 28800 }
    });

  } catch (error: any) {
    if (error instanceof HTTPException) throw error;
    console.error('Admin Login Error:', error);
    throw new HTTPException(500, { message: 'Login failed' });
  }
});

/* =========================================================
   Dashboard Stats
   ========================================================= */
admin.get('/stats', async (c) => {
  // Parallel DB queries for performance
  const [
    usersTotal,
    usersPending,
    usersActive,
    usersPremium,
    appsPending
  ] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as c FROM users').first<any>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'pending'").first<any>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'active'").first<any>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM users WHERE account_type = 'premium' AND status = 'active'").first<any>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM applications WHERE status = 'Pending'").first<any>()
  ]);

  return c.json({
    success: true,
    data: {
      users: {
        total: usersTotal?.c || 0,
        pending: usersPending?.c || 0,
        active: usersActive?.c || 0,
        premium: usersPremium?.c || 0,
      },
      applications: {
        pending: appsPending?.c || 0
      }
    }
  });
});

/* =========================================================
   Applications Management
   ========================================================= */
admin.get('/applications', async (c) => {
  const results = await c.env.DB.prepare(`
    SELECT
      u.id as user_id, u.email, u.status as user_status,
      a.id as application_id, a.motivation, a.experience, a.requested_handle as handle, a.created_at
    FROM applications a
    JOIN users u ON a.user_id = u.id
    WHERE a.status = 'Pending'
    ORDER BY a.created_at DESC
  `).all();

  return c.json({
    success: true,
    data: { applications: results.results }
  });
});

admin.post('/approve', async (c) => {
  const { userId, platformHandle } = await c.req.json<AdminApproveRequest>();
  
  if (!userId || !platformHandle) throw new HTTPException(400, { message: 'Missing fields' });

  // 1. Check handle uniqueness
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE platform_handle = ?').bind(platformHandle).first();
  if (existing) throw new HTTPException(409, { message: 'Handle taken' });

  // 2. Transaction: Update User & Application
  const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET status = 'active', role = 'student', platform_handle = ?, updated_at = ? WHERE id = ?").bind(platformHandle, now, userId),
    c.env.DB.prepare("UPDATE applications SET status = 'Accepted', updated_at = ? WHERE user_id = ?").bind(now, userId)
  ]);

  return c.json({ success: true, message: 'Approved' });
});

admin.post('/reject', async (c) => {
  const { userId } = await c.req.json<AdminRejectRequest>();
  const now = new Date().toISOString();

  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET status = 'rejected', updated_at = ? WHERE id = ?").bind(now, userId),
    c.env.DB.prepare("UPDATE applications SET status = 'Rejected', updated_at = ? WHERE user_id = ?").bind(now, userId)
  ]);

  return c.json({ success: true, message: 'Rejected' });
});

/* =========================================================
   User Management (Bulk)
   ========================================================= */
admin.get('/users', async (c) => {
  const result = await c.env.DB.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT 100").all();
  return c.json({ success: true, data: { users: result.results } });
});

admin.post('/bulk-action', async (c) => {
  const { action, userIds } = await c.req.json<AdminBulkActionRequest>();
  
  if (!userIds || !userIds.length) throw new HTTPException(400, { message: 'No users selected' });

  let query = '';
  switch (action) {
    case 'suspend': query = "UPDATE users SET status = 'suspended' WHERE id = ?"; break;
    case 'activate': query = "UPDATE users SET status = 'active' WHERE id = ?"; break;
    case 'upgrade': query = "UPDATE users SET account_type = 'premium' WHERE id = ?"; break;
    case 'downgrade': query = "UPDATE users SET account_type = 'simple' WHERE id = ?"; break;
    default: throw new HTTPException(400, { message: 'Invalid action' });
  }

  // Execute in sequence or batch (D1 batch limit is often 100, manual loop is safer for variable length)
  const stmts = userIds.map(id => c.env.DB.prepare(query).bind(id));
  await c.env.DB.batch(stmts);

  return c.json({ success: true, message: `Processed ${action} for ${userIds.length} users` });
});

/* =========================================================
   Data Export
   ========================================================= */
admin.post('/export-data', async (c) => {
  const { type, format } = await c.req.json<AdminExportRequest>();
  
  let data: any[] = [];
  if (type === 'users') {
    const res = await c.env.DB.prepare("SELECT * FROM users").all();
    data = res.results;
  } else if (type === 'applications') {
    const res = await c.env.DB.prepare("SELECT * FROM applications").all();
    data = res.results;
  } else {
    throw new HTTPException(400, { message: 'Invalid export type' });
  }

  if (format === 'csv') {
    return c.text(convertToCSV(data));
  }
  
  return c.json({ success: true, data });
});

export default admin;