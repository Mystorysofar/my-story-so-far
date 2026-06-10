import { createClient } from '@supabase/supabase-js';

// Caller-scoped read/remove of a child's social workers.
//   GET  ?child_id=...        -> list that child's social workers (name, email, id)
//   POST { child_id, social_worker_id, action:'remove' } -> remove one link
// Authorisation: admin (any child) OR manager/staff whose home owns the child.
// Keeps the privacy wall intact: a manager never gets blanket read of profiles;
// the route answers only "who are THIS child's social workers" after verifying
// the caller is entitled to that child.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

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
    const callerRole = profile.role;
    const callerHome = profile.home_id;

    // child_id comes from query (GET) or body (POST)
    const child_id = req.method === 'GET'
      ? (req.query?.child_id || null)
      : (req.body?.child_id || null);
    if (!child_id) {
      return res.status(400).json({ error: 'Missing child_id' });
    }

    // Entitlement: admin may act on any child; manager/staff only on a child in
    // their own home. Verified server-side against the children table.
    if (callerRole !== 'admin') {
      if (callerRole !== 'manager' && callerRole !== 'staff') {
        return res.status(403).json({ error: 'Your role cannot manage social workers' });
      }
      const { data: childRow, error: childErr } = await admin
        .from('children')
        .select('id, home_id')
        .eq('id', child_id)
        .single();
      if (childErr || !childRow) {
        return res.status(404).json({ error: 'Child not found' });
      }
      if (!callerHome || childRow.home_id !== callerHome) {
        return res.status(403).json({ error: 'You can only manage social workers for children in your own home' });
      }
    }

    // ── GET: list this child's social workers ──────────────────────────
    if (req.method === 'GET') {
      const { data: links, error: linkErr } = await admin
        .from('child_social_workers')
        .select('social_worker_id, assigned_at')
        .eq('child_id', child_id);
      if (linkErr) {
        return res.status(500).json({ error: 'Could not load assignments: ' + linkErr.message });
      }
      const ids = (links || []).map(l => l.social_worker_id);
      if (ids.length === 0) {
        return res.status(200).json({ ok: true, social_workers: [] });
      }
      const { data: people, error: peopleErr } = await admin
        .from('profiles')
        .select('id, name, email')
        .in('id', ids);
      if (peopleErr) {
        return res.status(500).json({ error: 'Could not load social worker details: ' + peopleErr.message });
      }
      const byId = {};
      (people || []).forEach(p => { byId[p.id] = p; });
      const social_workers = (links || []).map(l => ({
        id: l.social_worker_id,
        name: byId[l.social_worker_id]?.name || '(pending)',
        email: byId[l.social_worker_id]?.email || '',
        assigned_at: l.assigned_at || null,
      }));
      return res.status(200).json({ ok: true, social_workers });
    }

    // ── POST: remove one link ──────────────────────────────────────────
    const { social_worker_id, action } = req.body || {};
    if (action !== 'remove') {
      return res.status(400).json({ error: 'Unknown action' });
    }
    if (!social_worker_id) {
      return res.status(400).json({ error: 'Missing social_worker_id' });
    }
    const { error: delErr } = await admin
      .from('child_social_workers')
      .delete()
      .eq('child_id', child_id)
      .eq('social_worker_id', social_worker_id);
    if (delErr) {
      return res.status(500).json({ error: 'Could not remove: ' + delErr.message });
    }
    return res.status(200).json({ ok: true, removed: true });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
