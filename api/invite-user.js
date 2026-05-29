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

    // Validate the caller's token using the publishable key (admin client uses
    // service_role which the auth endpoint rejects for getUser with legacy keys off).
    const publishableKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    if (!publishableKey) {
      return res.status(500).json({ error: 'Server is missing publishable key' });
    }
    const browserClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false } });
    const { data: userResult, error: userErr } = await browserClient.auth.getUser(token);
    // Admin client is built only after token validation succeeds
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    if (userErr || !userResult?.user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('role, home_id')
      .eq('id', userResult.user.id)
      .single();
    if (profileErr || !profile) {
      return res.status(403).json({ error: 'No profile found for caller' });
    }

    // Validate the request body
    const { name, email, role, home_id } = req.body || {};
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Missing required fields: name, email, role' });
    }

    // Role matrix:
    //   admin   → can invite anyone to any home
    //   manager → can invite staff or child, must be same home_id
    //   staff   → can invite child only, must be same home_id
    //   child   → cannot invite anyone
    const callerRole = profile.role;
    const callerHome = profile.home_id;
    if (callerRole === 'admin') {
      // no restriction
    } else if (callerRole === 'manager') {
      if (role !== 'staff' && role !== 'child') {
        return res.status(403).json({ error: 'Managers can only invite staff or children' });
      }
      if (!callerHome || home_id !== callerHome) {
        return res.status(403).json({ error: 'Managers can only invite users into their own home' });
      }
    } else if (callerRole === 'staff') {
      if (role !== 'child') {
        return res.status(403).json({ error: 'Staff can only invite children' });
      }
      if (!callerHome || home_id !== callerHome) {
        return res.status(403).json({ error: 'Staff can only invite children into their own home' });
      }
    } else {
      return res.status(403).json({ error: 'Your role cannot invite users' });
    }
    const allowedRoles = ['admin', 'manager', 'staff', 'child'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, manager, staff or child.' });
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
