import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { isSubscriptionGoneStatus, sendWebPush } from '../_shared/push.ts'

type PushRow = {
  id: string
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
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, { error: 'Missing SUPABASE_URL/SUPABASE_ANON_KEY.' })
  }

  const authHeader = req.headers.get('Authorization') || ''
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser()

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

  if (action === 'send_test') {
    const { data, error } = await client
      .from('push_subscriptions')
      .select('id, subscription, app_base_url')
      .eq('user_id', user.id)
      .eq('enabled', true)
      .eq('notif_enabled', true)

    if (error) return jsonResponse(400, { error: error.message })
    const rows = (Array.isArray(data) ? data : []) as PushRow[]

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
    })
  }

  return jsonResponse(400, { error: 'Unsupported action.' })
})
