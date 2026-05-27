import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: 'Server is missing Supabase configuration' });
    }

    // Verify the caller is an admin
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Not signed in' });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: userResult, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userResult?.user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userResult.user.id)
      .single();
    if (profileErr || !profile) {
      return res.status(403).json({ error: 'No profile found for caller' });
    }
    // TODO Sitting 6: extend to allow managers to invite staff into their own home_id
    if (profile.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can invite users' });
    }

    // Validate the request body
    const { name, email, role, home_id } = req.body || {};
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Missing required fields: name, email, role' });
    }
    const allowedRoles = ['admin', 'manager', 'staff'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, manager or staff.' });
    }

    // Send the invite
    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        name,
        role,
        home_id: home_id || null,
        needs_password_set: true,
      },
    });
    if (inviteErr) {
      return res.status(400).json({ error: inviteErr.message });
    }

    return res.status(200).json({ ok: true, user_id: inviteData?.user?.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
