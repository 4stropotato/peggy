const CLOUD_SESSION_KEY = 'baby-prep-cloud-session';

function getCloudConfig() {
  const url = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  return {
    url,
    anonKey,
    configured: Boolean(url && anonKey)
  };
}

function readSession() {
  try {
    const raw = localStorage.getItem(CLOUD_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.accessToken || !parsed?.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(session) {
  localStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(session));
  return session;
}

function buildHeaders(config, accessToken, extra = {}) {
  const headers = {
    apikey: config.anonKey,
    'Content-Type': 'application/json',
    ...extra
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

async function readErrorText(resp) {
  try {
    const body = await resp.json();
    return body?.msg || body?.message || body?.error_description || body?.error || `HTTP ${resp.status}`;
  } catch {
    return `HTTP ${resp.status}`;
  }
}

async function cloudFetch(path, { method = 'GET', body, headers } = {}, accessToken = '') {
  const config = getCloudConfig();
  if (!config.configured) throw new Error('Cloud sync is not configured. Add Supabase env vars first.');

  const resp = await fetch(`${config.url}${path}`, {
    method,
    headers: buildHeaders(config, accessToken, headers),
    body: body ? JSON.stringify(body) : undefined
  });

  if (!resp.ok) {
    throw new Error(await readErrorText(resp));
  }

  if (resp.status === 204) return null;
  return resp.json();
}

function normalizeSession(data) {
  if (!data?.access_token || !data?.user?.id) {
    throw new Error('Missing auth session from Supabase.');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
    expiresAt: nowSec + (Number(data.expires_in) || 3600),
    user: {
      id: data.user.id,
      email: data.user.email || ''
    }
  };
}

function encodeEqValue(value) {
  return encodeURIComponent(String(value));
}

export function isCloudConfigured() {
  return getCloudConfig().configured;
}

export function getCloudSession() {
  return readSession();
}

export function clearCloudSession() {
  localStorage.removeItem(CLOUD_SESSION_KEY);
}

export async function cloudSignUp(email, password, redirectTo = '') {
  const body = { email, password };
  const signupPath = redirectTo
    ? `/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`
    : '/auth/v1/signup';
  const headers = redirectTo ? { redirect_to: redirectTo } : undefined;

  const data = await cloudFetch(signupPath, {
    method: 'POST',
    headers,
    body
  });

  // If email confirmation is required, Supabase may not return a session immediately.
  if (!data?.access_token || !data?.user?.id) {
    return {
      session: null,
      message: 'Account created. If email confirmation is enabled, confirm first then sign in.'
    };
  }

  const session = writeSession(normalizeSession(data));
  return { session, message: 'Account created and signed in.' };
}

export async function cloudSignIn(email, password) {
  const data = await cloudFetch('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password }
  });
  const session = writeSession(normalizeSession(data));
  return session;
}

export async function cloudSignOut() {
  const session = readSession();
  if (!session?.accessToken) {
    clearCloudSession();
    return;
  }

  try {
    await cloudFetch('/auth/v1/logout', { method: 'POST' }, session.accessToken);
  } finally {
    clearCloudSession();
  }
}

export async function cloudValidateSession(session) {
  const data = await cloudFetch('/auth/v1/user', { method: 'GET' }, session?.accessToken || '');
  return writeSession({
    ...session,
    user: {
      id: data.id,
      email: data.email || ''
    }
  });
}

export async function cloudUploadBackup(backup, session) {
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not signed in.');

  const row = [{
    user_id: userId,
    payload: backup,
    updated_at: new Date().toISOString()
  }];

  const data = await cloudFetch(
    '/rest/v1/cloud_backups?on_conflict=user_id',
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: row
    },
    session.accessToken
  );

  return data?.[0] || null;
}

export async function cloudDownloadBackup(session) {
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not signed in.');

  const data = await cloudFetch(
    `/rest/v1/cloud_backups?select=payload,updated_at&user_id=eq.${encodeEqValue(userId)}&limit=1`,
    { method: 'GET' },
    session.accessToken
  );

  if (!Array.isArray(data) || !data.length || !data[0]?.payload) {
    throw new Error('No cloud backup found yet.');
  }

  return {
    backup: data[0].payload,
    updatedAt: data[0].updated_at || null
  };
}
