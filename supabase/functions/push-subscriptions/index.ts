import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { isSubscriptionGoneStatus, sendWebPush } from '../_shared/push.ts'

type PushRow = {
  id: string
  device_id: string | null
  endpoint: string | null
  subscription: Record<string, unknown>
  app_base_url: string | null
}

function getEnv(name: string) {
  return Deno.env.get(name) || ''
}

function parseJsonSafe(req: Request) {
  return req.json().catch(() => ({}))
}

function getSafeUrl(path: string) {
  const value = String(path || '/').trim()
  if (!value) return '/'
  return value
}

function buildTestPayload(appBaseUrl: string) {
  const stamp = Date.now()
  return {
    title: 'Peggy test notification',
    body: 'Push is connected on this device.',
    tag: `peggy-test-${stamp}`,
    url: getSafeUrl(appBaseUrl || '/peggy/'),
    renotify: true,
    requireInteraction: true,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = getEnv('SUPABASE_URL')
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY.' })
  }

  const authHeader = req.headers.get('Authorization') || ''
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!accessToken) {
    return jsonResponse(401, { error: 'Unauthorized' })
  }

  const client = createClient(supabaseUrl, serviceRoleKey)

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser(accessToken)

  if (userError || !user?.id) {
    return jsonResponse(401, { error: 'Unauthorized' })
  }

  const body = await parseJsonSafe(req)
  const action = String(body?.action || 'upsert').toLowerCase()

  if (action === 'upsert') {
    const subscription = body?.subscription && typeof body.subscription === 'object'
      ? body.subscription
      : null

    const endpoint = String(body?.endpoint || subscription?.endpoint || '').trim()
    const p256dh = String(body?.p256dh || subscription?.keys?.p256dh || '').trim()
    const auth = String(body?.auth || subscription?.keys?.auth || '').trim()
    const deviceId = String(body?.deviceId || '').trim() || 'unknown-device'

    if (!endpoint || !p256dh || !auth) {
      return jsonResponse(400, { error: 'Invalid subscription payload.' })
    }

    const nowIso = new Date().toISOString()
    const row = {
      user_id: user.id,
      device_id: deviceId,
      endpoint,
      p256dh,
      auth,
      subscription: subscription || {
        endpoint,
        keys: { p256dh, auth },
      },
      enabled: Boolean(body?.notifEnabled ?? true),
      notif_enabled: Boolean(body?.notifEnabled ?? true),
      user_agent: String(body?.userAgent || '').trim() || null,
      platform: String(body?.platform || '').trim() || null,
      app_base_url: getSafeUrl(String(body?.appBaseUrl || '/peggy/')),
      last_seen_at: nowIso,
      updated_at: nowIso,
    }

    let { data, error } = await client
      .from('push_subscriptions')
      .upsert(row, { onConflict: 'user_id,device_id' })
      .select('id, endpoint, enabled, notif_enabled, updated_at')
      .single()

    const endpointConflict = Boolean(error?.message && /endpoint/i.test(error.message))
    if (endpointConflict) {
      const fallback = await client
        .from('push_subscriptions')
        .update(row)
        .eq('user_id', user.id)
        .eq('endpoint', endpoint)
        .select('id, endpoint, enabled, notif_enabled, updated_at')
        .single()
      data = fallback.data as typeof data
      error = fallback.error as typeof error
    }

    if (error) return jsonResponse(400, { error: error.message, code: error.code || null })
    return jsonResponse(200, { ok: true, subscription: data })
  }

  if (action === 'disable') {
    const endpoint = String(body?.endpoint || '').trim()
    const deviceId = String(body?.deviceId || '').trim()
    const nowIso = new Date().toISOString()

    let query = client
      .from('push_subscriptions')
      .update({
        enabled: false,
        notif_enabled: false,
        updated_at: nowIso,
      })
      .eq('user_id', user.id)

    if (endpoint) {
      query = query.eq('endpoint', endpoint)
    } else if (deviceId) {
      query = query.eq('device_id', deviceId)
    }

    const { data, error } = await query.select('id')
    if (error) return jsonResponse(400, { error: error.message })
    return jsonResponse(200, { ok: true, updated: Array.isArray(data) ? data.length : 0 })
  }

  if (action === 'sync_reminders') {
    const deviceId = String(body?.deviceId || '').trim()
    if (!deviceId) {
      return jsonResponse(400, { error: 'Missing deviceId.' })
    }

    const rawReminders = Array.isArray(body?.reminders) ? body.reminders : []
    const sanitized = rawReminders.slice(0, 12).map((r: Record<string, unknown>) => ({
      type: String(r?.type || 'general').slice(0, 30),
      level: String(r?.level || 'gentle').slice(0, 20),
      title: String(r?.notificationTitle || r?.title || '').slice(0, 120),
      body: String(r?.notificationBody || r?.body || '').slice(0, 300),
      tag: String(r?.tag || '').slice(0, 80),
      fireAt: String(r?.fireAt || '').slice(0, 30),
      priorityScore: Number(r?.priorityScore) || 0,
    }))

    const nowIso = new Date().toISOString()
    const { data, error } = await client
      .from('push_subscriptions')
      .update({
        pending_reminders: sanitized.length > 0 ? sanitized : null,
        reminders_synced_at: nowIso,
        last_seen_at: nowIso,
      })
      .eq('user_id', user.id)
      .eq('device_id', deviceId)
      .select('id, device_id')

    if (error) return jsonResponse(400, { error: error.message })
    return jsonResponse(200, {
      ok: true,
      synced: sanitized.length,
      updated: Array.isArray(data) ? data.length : 0,
    })
  }

  if (action === 'send_test') {
    const targetDeviceId = String(body?.deviceId || '').trim()

    let query = client
      .from('push_subscriptions')
      .select('id, device_id, endpoint, subscription, app_base_url, enabled, notif_enabled, last_seen_at')
      .eq('user_id', user.id)
    if (targetDeviceId) {
      // Manual test from a specific device should still work even when reminder toggles are OFF.
      // This validates transport/registration without changing user preference state.
      query = query.eq('device_id', targetDeviceId)
    } else {
      query = query
        .eq('enabled', true)
        .eq('notif_enabled', true)
    }

    const { data, error } = await query

    if (error) return jsonResponse(400, { error: error.message })
    let rows = (Array.isArray(data) ? data : []) as (PushRow & {
      enabled?: boolean
      notif_enabled?: boolean
      last_seen_at?: string | null
    })[]

    let fallbackUsed = false
    if (targetDeviceId && rows.length === 0) {
      const fallback = await client
        .from('push_subscriptions')
        .select('id, device_id, endpoint, subscription, app_base_url, enabled, notif_enabled, last_seen_at')
        .eq('user_id', user.id)
        .eq('enabled', true)
        .eq('notif_enabled', true)
        .order('last_seen_at', { ascending: false })
        .limit(3)
      if (!fallback.error && Array.isArray(fallback.data) && fallback.data.length > 0) {
        rows = fallback.data as typeof rows
        fallbackUsed = true
      }
    }

    const staleIds: string[] = []
    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const row of rows) {
      const push = await sendWebPush(row.subscription, buildTestPayload(row.app_base_url || '/peggy/'))
      if (push.ok) {
        sent += 1
        continue
      }
      failed += 1
      const status = Number(push.statusCode || 0)
      const message = String(push.message || 'push-send-failed').slice(0, 180)
      if (errors.length < 5) {
        errors.push(`status=${status || 'n/a'} ${message}`)
      }
      if (isSubscriptionGoneStatus(push.statusCode) && row.id) {
        staleIds.push(row.id)
      }
    }

    if (staleIds.length > 0) {
      await client
        .from('push_subscriptions')
        .update({
          enabled: false,
          notif_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .in('id', staleIds)
    }

    return jsonResponse(200, {
      ok: true,
      sent,
      total: rows.length,
      stale: staleIds.length,
      failed,
      errors,
      targetDeviceId: targetDeviceId || null,
      fallbackUsed,
    })
  }

  return jsonResponse(400, { error: 'Unsupported action.' })
})
