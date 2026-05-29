import { createClient } from '@supabase/supabase-js';

// Role rank — used to prevent promotion above caller's own rank
const RANK = { child: 0, staff: 1, manager: 2, admin: 3 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const publishableKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !serviceKey || !publishableKey) {
      return res.status(500).json({ error: 'Server is missing Supabase configuration' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Not signed in' });
    }

    const browserClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false } });
    const { data: userResult, error: userErr } = await browserClient.auth.getUser(token);
    if (userErr || !userResult?.user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('role, home_id')
      .eq('id', userResult.user.id)
      .single();
    if (profileErr || !profile) {
      return res.status(403).json({ error: 'No profile found for caller' });
    }

    const { user_id, name, role, home_id } = req.body || {};
    if (!user_id) {
      return res.status(400).json({ error: 'Missing required field: user_id' });
    }
    if (name === undefined && role === undefined && home_id === undefined) {
      return res.status(400).json({ error: 'No update fields provided' });
    }

    const { data: target, error: targetErr } = await admin
      .from('profiles')
      .select('role, home_id')
      .eq('id', user_id)
      .single();
    if (targetErr || !target) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const callerRole = profile.role;
    const callerHome = profile.home_id;

    // Role matrix for editing:
    //   admin   -> can edit anyone
    //   manager -> can edit staff or child in own home
    //   staff   -> can edit child in own home
    //   child   -> cannot edit anyone
    if (callerRole === 'admin') {
      // no restriction
    } else if (callerRole === 'manager') {
      if (target.role !== 'staff' && target.role !== 'child') {
        return res.status(403).json({ error: 'Managers can only edit staff or children' });
      }
      if (!callerHome || target.home_id !== callerHome) {
        return res.status(403).json({ error: 'Managers can only edit users in their own home' });
      }
    } else if (callerRole === 'staff') {
      if (target.role !== 'child') {
        return res.status(403).json({ error: 'Staff can only edit children' });
      }
      if (!callerHome || target.home_id !== callerHome) {
        return res.status(403).json({ error: 'Staff can only edit children in their own home' });
      }
    } else {
      return res.status(403).json({ error: 'Your role cannot edit users' });
    }

    const patch = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name must be a non-empty string' });
      }
      patch.name = name.trim();
    }
    if (role !== undefined) {
      const allowedRoles = ['admin', 'manager', 'staff', 'child'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      if (RANK[role] > RANK[callerRole]) {
        return res.status(403).json({ error: 'You cannot promote a user above your own role' });
      }
      patch.role = role;
    }
    if (home_id !== undefined) {
      if (callerRole !== 'admin') {
        return res.status(403).json({ error: 'Only admin can change a user home' });
      }
      patch.home_id = home_id || null;
    }

    const { error: updErr } = await admin
      .from('profiles')
      .update(patch)
      .eq('id', user_id);
    if (updErr) {
      return res.status(400).json({ error: updErr.message });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
