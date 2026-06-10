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

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Not signed in' });
    }

    const publishableKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    if (!publishableKey) {
      return res.status(500).json({ error: 'Server is missing publishable key' });
    }
    const browserClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false } });
    const { data: userResult, error: userErr } = await browserClient.auth.getUser(token);
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

    // child_id is optional; only used when inviting/assigning a social worker.
    const { name, email, role, home_id, child_id } = req.body || {};
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Missing required fields: name, email, role' });
    }

    const callerRole = profile.role;
    const callerHome = profile.home_id;

    // Permission matrix:
    //   admin   -> invite anyone to any home
    //   manager -> invite staff/child in own home; OR a social_worker (must
    //              supply a child_id for a child in their own home)
    //   staff   -> invite child only, own home
    //   child   -> cannot invite
    if (callerRole === 'admin') {
      // no restriction
    } else if (callerRole === 'manager') {
      if (role === 'social_worker') {
        if (!child_id) {
          return res.status(400).json({ error: 'A child must be selected when a manager invites a social worker.' });
        }
        const { data: childRow, error: childErr } = await admin
          .from('children')
          .select('id, home_id, preferred_name')
          .eq('id', child_id)
          .single();
        if (childErr || !childRow) {
          return res.status(400).json({ error: 'Child not found' });
        }
        if (!callerHome || childRow.home_id !== callerHome) {
          return res.status(403).json({ error: 'Managers can only assign social workers to children in their own home' });
        }
      } else if (role === 'staff' || role === 'child') {
        if (!callerHome || home_id !== callerHome) {
          return res.status(403).json({ error: 'Managers can only invite users into their own home' });
        }
      } else {
        return res.status(403).json({ error: 'Managers cannot invite that role' });
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

    const allowedRoles = ['admin', 'manager', 'staff', 'child', 'social_worker'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    // Social worker with a child: reuse-or-invite, then link.
    if (role === 'social_worker' && child_id) {
      const { data: existing, error: existErr } = await admin
        .from('profiles')
        .select('id, role')
        .eq('email', email)
        .maybeSingle();
      if (existErr) {
        return res.status(500).json({ error: 'Could not check existing user: ' + existErr.message });
      }

      let swId;
      if (existing) {
        if (existing.role !== 'social_worker') {
          return res.status(409).json({ error: 'That email already belongs to a non-social-worker account.' });
        }
        swId = existing.id;
      } else {
        const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
          data: { name, role: 'social_worker', home_id: null, needs_password_set: true },
        });
        if (inviteErr) {
          return res.status(400).json({ error: inviteErr.message });
        }
        swId = inviteData?.user?.id;
        if (!swId) {
          return res.status(500).json({ error: 'Invite succeeded but no user id returned' });
        }
        await admin.from('profiles').upsert(
          { id: swId, email, name, role: 'social_worker', home_id: null },
          { onConflict: 'id' }
        );
      }

      const { error: linkErr } = await admin
        .from('child_social_workers')
        .insert({ child_id, social_worker_id: swId, assigned_by: userResult.user.id });
      if (linkErr && !/duplicate key|unique/i.test(linkErr.message)) {
        return res.status(500).json({ error: 'Account ready but linking failed: ' + linkErr.message });
      }

      return res.status(200).json({ ok: true, user_id: swId, reused: !!existing });
    }

    // Default path: ordinary invite.
    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { name, role, home_id: home_id || null, needs_password_set: true },
    });
    if (inviteErr) {
      return res.status(400).json({ error: inviteErr.message });
    }
    return res.status(200).json({ ok: true, user_id: inviteData?.user?.id });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
