const CLOUD_SESSION_KEY = 'baby-prep-cloud-session';
const CLOUD_SESSION_EVENT = 'peggy-cloud-session-changed';
const REFRESH_SKEW_SECONDS = 45;

function notifySessionChanged(session) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CLOUD_SESSION_EVENT, { detail: { session: session || null } }));
  }
}

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
  notifySessionChanged(session);
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

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function normalizeSession(data, fallbackSession = null) {
  const resolvedUser = data?.user || fallbackSession?.user || null;
  if (!data?.access_token || !resolvedUser?.id) {
    throw new Error('Missing auth session from Supabase.');
  }

  const nowSec = nowSeconds();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || fallbackSession?.refreshToken || '',
    expiresAt: nowSec + (Number(data.expires_in) || 3600),
    user: {
      id: resolvedUser.id,
      email: resolvedUser.email || ''
    }
  };
}

function isSessionNearExpiry(session, skewSeconds = REFRESH_SKEW_SECONDS) {
  if (!session?.expiresAt) return false;
  return nowSeconds() >= (Number(session.expiresAt) - skewSeconds);
}

function isAuthError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return (
    msg.includes('jwt') ||
    msg.includes('token') ||
    msg.includes('expired') ||
    msg.includes('unauthorized') ||
    msg.includes('invalid claim') ||
    msg.includes('http 401')
  );
}

function requireSession(session) {
  if (!session?.accessToken || !session?.user?.id) {
    throw new Error('Not signed in.');
  }
  return session;
}

async function cloudRefreshSessionInternal(session) {
  const current = requireSession(session);
  if (!current.refreshToken) {
    throw new Error('Session expired. Please sign in again.');
  }

  const data = await cloudFetch('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: current.refreshToken }
  });

  return writeSession(normalizeSession(data, current));
}

async function withSessionRetry(session, action) {
  let active = requireSession(session);
  if (isSessionNearExpiry(active) && active.refreshToken) {
    active = await cloudRefreshSessionInternal(active);
  }

  try {
    return { result: await action(active), session: active };
  } catch (err) {
    if (!active.refreshToken || !isAuthError(err)) throw err;
    const refreshed = await cloudRefreshSessionInternal(active);
    return { result: await action(refreshed), session: refreshed };
  }
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
  notifySessionChanged(null);
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

export async function cloudRefreshSession(session = null) {
  const source = session || readSession();
  if (!source) throw new Error('Not signed in.');
  return cloudRefreshSessionInternal(source);
}

export async function cloudValidateSession(session) {
  const { result: data, session: active } = await withSessionRetry(session, async (workingSession) => {
    return cloudFetch('/auth/v1/user', { method: 'GET' }, workingSession.accessToken);
  });

  return writeSession({
    ...active,
    user: {
      id: data.id,
      email: data.email || active.user?.email || ''
    }
  });
}

export async function cloudUploadBackup(backup, session) {
  const { result } = await withSessionRetry(session, async (workingSession) => {
    const row = [{
      user_id: workingSession.user.id,
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
      workingSession.accessToken
    );

    return data?.[0] || null;
  });

  return result;
}

export async function cloudDownloadBackup(session) {
  const { result: data } = await withSessionRetry(session, async (workingSession) => {
    return cloudFetch(
      `/rest/v1/cloud_backups?select=payload,updated_at&user_id=eq.${encodeEqValue(workingSession.user.id)}&limit=1`,
      { method: 'GET' },
      workingSession.accessToken
    );
  });

  if (!Array.isArray(data) || !data.length || !data[0]?.payload) {
    throw new Error('No cloud backup found yet.');
  }

  return {
    backup: data[0].payload,
    updatedAt: data[0].updated_at || null
  };
}

export async function cloudUpsertPushSubscription(payload, session) {
  const body = {
    action: 'upsert',
    ...(payload && typeof payload === 'object' ? payload : {})
  };

  const { result } = await withSessionRetry(session, async (workingSession) => {
    return cloudFetch(
      '/functions/v1/push-subscriptions',
      {
        method: 'POST',
        body
      },
      workingSession.accessToken
    );
  });

  return result;
}

export async function cloudDisablePushSubscription(payload, session) {
  const body = {
    action: 'disable',
    ...(payload && typeof payload === 'object' ? payload : {})
  };

  const { result } = await withSessionRetry(session, async (workingSession) => {
    return cloudFetch(
      '/functions/v1/push-subscriptions',
      {
        method: 'POST',
        body
      },
      workingSession.accessToken
    );
  });

  return result;
}

export async function cloudSendPushTest(session) {
  const { result } = await withSessionRetry(session, async (workingSession) => {
    return cloudFetch(
      '/functions/v1/push-subscriptions',
      {
        method: 'POST',
        body: { action: 'send_test' }
      },
      workingSession.accessToken
    );
  });

  return result;
}
