import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { isSubscriptionGoneStatus, sendWebPush } from '../_shared/push.ts'

type DispatchRow = {
  id: string
  subscription: Record<string, unknown>
  app_base_url: string | null
  last_push_at: string | null
}

function getEnv(name: string) {
  return Deno.env.get(name) || ''
}

function getDispatchBody() {
  const title = (getEnv('PUSH_DEFAULT_TITLE') || 'Peggy reminder').trim()
  const body = (getEnv('PUSH_DEFAULT_BODY') || 'Quick check-in: open Peggy for your reminders.').trim()
  return { title, body }
}

function getMinIntervalMinutes() {
  const raw = Number(getEnv('PUSH_MIN_INTERVAL_MINUTES') || 120)
  if (!Number.isFinite(raw) || raw < 1) return 120
  return Math.round(raw)
}

function shouldDispatch(row: DispatchRow, nowMs: number, minIntervalMinutes: number) {
  if (!row.last_push_at) return true
  const last = new Date(row.last_push_at).getTime()
  if (!Number.isFinite(last)) return true
  const gapMs = minIntervalMinutes * 60 * 1000
  return nowMs - last >= gapMs
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const cronSecret = getEnv('PUSH_CRON_SECRET')
  const incomingSecret = req.headers.get('x-push-cron-secret') || ''
  if (!cronSecret || incomingSecret !== cronSecret) {
    return jsonResponse(401, { error: 'Unauthorized' })
  }

  const supabaseUrl = getEnv('SUPABASE_URL')
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY.' })
  }

  const service = createClient(supabaseUrl, serviceRoleKey)
  const { title, body } = getDispatchBody()
  const minIntervalMinutes = getMinIntervalMinutes()
  const now = new Date()
  const nowIso = now.toISOString()
  const nowMs = now.getTime()

  const { data, error } = await service
    .from('push_subscriptions')
    .select('id, subscription, app_base_url, last_push_at')
    .eq('enabled', true)
    .eq('notif_enabled', true)
    .limit(2000)

  if (error) return jsonResponse(500, { error: error.message })

  const rows = (Array.isArray(data) ? data : []) as DispatchRow[]
  const dueRows = rows.filter(row => shouldDispatch(row, nowMs, minIntervalMinutes))
  const staleIds: string[] = []
  const sentIds: string[] = []

  for (const row of dueRows) {
    const payload = {
      title,
      body,
      tag: `peggy-auto-${now.getHours()}`,
      url: row.app_base_url || '/peggy/',
      renotify: false,
      requireInteraction: false,
    }
    const push = await sendWebPush(row.subscription, payload)
    if (push.ok) {
      sentIds.push(row.id)
      continue
    }
    if (isSubscriptionGoneStatus(push.statusCode)) {
      staleIds.push(row.id)
    }
  }

  if (sentIds.length > 0) {
    await service
      .from('push_subscriptions')
      .update({
        last_push_at: nowIso,
        updated_at: nowIso,
      })
      .in('id', sentIds)
  }

  if (staleIds.length > 0) {
    await service
      .from('push_subscriptions')
      .update({
        enabled: false,
        notif_enabled: false,
        updated_at: nowIso,
      })
      .in('id', staleIds)
  }

  return jsonResponse(200, {
    ok: true,
    scanned: rows.length,
    due: dueRows.length,
    sent: sentIds.length,
    stale: staleIds.length,
    minIntervalMinutes,
  })
})
