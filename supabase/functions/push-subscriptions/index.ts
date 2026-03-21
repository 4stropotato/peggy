import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { isSubscriptionGoneStatus, sendWebPush } from '../_shared/push.ts'

type PushRow = {
  id: string
  device_id: string | null
  endpoint: string | null
  subscription: Record<string, unknown>
  app_base_url: string | null
  pending_reminders?: ReminderItem[] | null
}

type ReminderAction = {
  action: string
  title: string
}

type ReminderItem = {
  type: string
  level: string
  title: string
  body: string
  tag: string
  fireAt: string
  priorityScore: number
  url?: string
  actions?: ReminderAction[]
  actionUrls?: Record<string, string>
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

function sanitizeReminderAction(value: unknown): ReminderAction | null {
  if (!value || typeof value !== 'object') return null
  const action = String((value as Record<string, unknown>)?.action || '').trim().slice(0, 80)
  const title = String((value as Record<string, unknown>)?.title || '').trim().slice(0, 40)
  if (!action || !title) return null
  return { action, title }
}

function sanitizeReminderActionUrls(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, url]) => [String(key || '').trim().slice(0, 80), getSafeUrl(String(url || '').trim())] as const)
    .filter(([key, url]) => key && url)
  if (entries.length === 0) return null
  return Object.fromEntries(entries)
}

function sanitizeReminderList(rawReminders: unknown, fallbackUrl: string) {
  const source = Array.isArray(rawReminders) ? rawReminders : []
  return source.slice(0, 12).map((raw) => {
    const row = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
    const actions = Array.isArray(row.actions)
      ? row.actions.map(sanitizeReminderAction).filter(Boolean) as ReminderAction[]
      : []
    return {
      type: String(row?.type || 'general').slice(0, 30),
      level: String(row?.level || 'gentle').slice(0, 20),
      title: String(row?.notificationTitle || row?.title || '').slice(0, 120),
      body: String(row?.notificationBody || row?.body || '').slice(0, 300),
      tag: String(row?.tag || '').slice(0, 80),
      fireAt: String(row?.fireAt || '').slice(0, 40),
      priorityScore: Number(row?.priorityScore) || 0,
      url: getSafeUrl(String(row?.url || fallbackUrl || '/peggy/')),
      actions: actions.length > 0 ? actions : undefined,
      actionUrls: sanitizeReminderActionUrls(row?.actionUrls) || undefined,
    }
  }).filter((item) => item.title || item.body)
}

function pickReminderPreview(reminders: ReminderItem[], limit = 4) {
  const nowMs = Date.now()
  const sorted = [...(Array.isArray(reminders) ? reminders : [])].sort((a, b) => {
    const aFire = a.fireAt ? new Date(a.fireAt).getTime() : Number.POSITIVE_INFINITY
    const bFire = b.fireAt ? new Date(b.fireAt).getTime() : Number.POSITIVE_INFINITY
    const aDue = Number.isFinite(aFire) && aFire <= nowMs ? 0 : 1
    const bDue = Number.isFinite(bFire) && bFire <= nowMs ? 0 : 1
    if (aDue !== bDue) return aDue - bDue
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore
    if (aFire !== bFire) return aFire - bFire
    return String(a.type || '').localeCompare(String(b.type || ''))
  })

  const picked: ReminderItem[] = []
  const seenTypes = new Set<string>()
  for (const reminder of sorted) {
    const type = String(reminder?.type || '').trim()
    if (type && seenTypes.has(type)) continue
    picked.push(reminder)
    if (type) seenTypes.add(type)
    if (picked.length >= limit) break
  }
  if (picked.length < limit) {
    const seenTags = new Set(picked.map((item) => item.tag))
    for (const reminder of sorted) {
      if (seenTags.has(reminder.tag)) continue
      picked.push(reminder)
      seenTags.add(reminder.tag)
      if (picked.length >= limit) break
    }
  }
  return picked.slice(0, limit)
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

    const sanitized = sanitizeReminderList(body?.reminders, '/peggy/')

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
    const previewReminders = sanitizeReminderList(body?.previewReminders, '/peggy/')

    let query = client
      .from('push_subscriptions')
      .select('id, device_id, endpoint, subscription, app_base_url, pending_reminders, enabled, notif_enabled, last_seen_at')
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
        .select('id, device_id, endpoint, subscription, app_base_url, pending_reminders, enabled, notif_enabled, last_seen_at')
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
      const reminderSource = previewReminders.length > 0
        ? sanitizeReminderList(previewReminders, row.app_base_url || '/peggy/')
        : sanitizeReminderList(row.pending_reminders, row.app_base_url || '/peggy/')
      const preview = pickReminderPreview(reminderSource, 4)
      const payload = preview.length > 0
        ? { reminders: preview, url: getSafeUrl(row.app_base_url || '/peggy/') }
        : buildTestPayload(row.app_base_url || '/peggy/')
      const push = await sendWebPush(row.subscription, payload)
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
