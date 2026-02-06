
import { Hono } from 'hono';
import { Env, ApplicationSubmitRequest, ApiResponse } from './types';
import { generateUUID } from '../utils/crypto';

const applications = new Hono<{ Bindings: Env, Variables: { user: any } }>();

// Submit Application
applications.post('/', async (c) => {
  const userPayload = c.get('user'); // From JWT Middleware
  const body = await c.req.json() as ApplicationSubmitRequest;
  
  if (!body.requested_handle || !body.motivation || !body.experience) {
    return c.json({ success: false, error: 'Missing required fields' }, 400);
  }

  // Check if already applied
  const existing = await c.env.DB.prepare('SELECT id FROM applications WHERE user_id = ?').bind(userPayload.sub).first();
  if (existing) {
    return c.json({ success: false, error: 'Application already pending or submitted' }, 409);
  }

  const appId = generateUUID();
  const now = new Date().toISOString();

  // Transaction-like approach
  try {
    const batch = [
      c.env.DB.prepare(
        `INSERT INTO applications (id, user_id, requested_handle, motivation, experience, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'Pending', ?)`
      ).bind(appId, userPayload.sub, body.requested_handle, body.motivation, body.experience, now),
      
      c.env.DB.prepare(
        `INSERT INTO protocol_affirmations (user_id, btc_only, london_ny_only, r_multiple_only, no_signal_expectation, discipline_over_profit, personal_risk_acceptance, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
          userPayload.sub, // Linked to user_id now
          body.affirmations.btc_only ? 1 : 0, 
          body.affirmations.london_ny_only ? 1 : 0, 
          body.affirmations.r_multiple_only ? 1 : 0,
          body.affirmations.no_signal_expectation ? 1 : 0,
          body.affirmations.discipline_over_profit ? 1 : 0,
          body.affirmations.personal_risk_acceptance ? 1 : 0,
          now
      )
    ];

    await c.env.DB.batch(batch);

    return c.json({ success: true, message: 'Application submitted successfully' }, 201);
  } catch (e) {
    console.error(e);
    return c.json({ success: false, error: 'Failed to submit application' }, 500);
  }
});

// Get User Application Status
applications.get('/status', async (c) => {
  const userPayload = c.get('user');
  const app = await c.env.DB.prepare(
    `SELECT a.*, p.btc_only, p.london_ny_only 
     FROM applications a 
     LEFT JOIN protocol_affirmations p ON a.user_id = p.user_id 
     WHERE a.user_id = ?`
  ).bind(userPayload.sub).first();

  if (!app) {
    return c.json({ success: true, data: null, message: 'No application found' });
  }

  return c.json({ success: true, data: app });
});

// Get Affirmations Protocol
applications.get('/affirmations', (c) => {
  return c.json({
    success: true,
    data: {
      protocols: [
        { key: 'btc_only', label: 'I affirm that I will trade Bitcoin only.' },
        { key: 'london_ny_only', label: 'I affirm that I will trade London/NY Sessions only.' },
        { key: 'r_multiple_only', label: 'I affirm that I will respect R-multiples.' },
        { key: 'no_signal_expectation', label: 'I affirm that I do not expect signals.' },
        { key: 'discipline_over_profit', label: 'I affirm that discipline is more important than profit.' },
        { key: 'personal_risk_acceptance', label: 'I accept all personal risk.' }
      ]
    }
  });
});

export default applications;
