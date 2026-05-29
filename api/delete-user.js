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
    const publishableKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !serviceKey || !publishableKey) {
      return res.status(500).json({ error: 'Server is missing Supabase configuration' });
    }

    // Extract caller's session token
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Not signed in' });
    }

    // Validate the caller's token using the publishable-keyed client
    const browserClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false } });
    const { data: userResult, error: userErr } = await browserClient.auth.getUser(token);
    if (userErr || !userResult?.user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Admin client for privileged ops
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Verify caller is admin
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userResult.user.id)
      .single();
    if (profileErr || !profile) {
      return res.status(403).json({ error: 'No profile found for caller' });
    }
    // TODO Sitting 6: extend to allow managers to delete staff within their own home_id
    if (profile.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete users' });
    }

    // Validate body
    const { user_id } = req.body || {};
    if (!user_id) {
      return res.status(400).json({ error: 'Missing required field: user_id' });
    }

    // Block self-deletion — admin cannot delete their own account
    if (user_id === userResult.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // Perform the delete (cascade from auth.users to profiles is configured at DB level)
    const { error: delErr } = await admin.auth.admin.deleteUser(user_id);
    if (delErr) {
      return res.status(400).json({ error: delErr.message });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
