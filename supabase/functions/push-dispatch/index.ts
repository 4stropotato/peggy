import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { isSubscriptionGoneStatus, sendWebPush } from '../_shared/push.ts'

type ReminderItem = {
  type: string
  level: string
  title: string
  body: string
  tag: string
  fireAt: string
  priorityScore: number
}

type DispatchRow = {
  id: string
  subscription: Record<string, unknown>
  app_base_url: string | null
  last_push_at: string | null
  pending_reminders: ReminderItem[] | null
  reminders_synced_at: string | null
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
    .select('id, subscription, app_base_url, last_push_at, pending_reminders, reminders_synced_at')
    .eq('enabled', true)
    .eq('notif_enabled', true)
    .limit(2000)

  if (error) return jsonResponse(500, { error: error.message })

  const rows = (Array.isArray(data) ? data : []) as DispatchRow[]
  const staleIds: string[] = []
  const sentIds: string[] = []
  // Rows whose pending_reminders need to be updated (due items removed, future kept)
  const reminderUpdates: { id: string; remaining: ReminderItem[] | null }[] = []

  for (const row of rows) {
    const hasSchedule = Array.isArray(row.pending_reminders) && row.pending_reminders.length > 0

    if (hasSchedule) {
      // --- Schedule-based: send only reminders whose fireAt has arrived ---
      const dueNow: ReminderItem[] = []
      const future: ReminderItem[] = []
      for (const r of row.pending_reminders!) {
        const fireAtMs = r.fireAt ? new Date(r.fireAt).getTime() : 0
        if (!r.fireAt || !Number.isFinite(fireAtMs) || fireAtMs <= nowMs) {
          dueNow.push(r)
        } else {
          future.push(r)
        }
      }

      if (dueNow.length === 0) continue // nothing due yet, skip

      const payload = {
        reminders: dueNow.slice(0, 6),
        url: row.app_base_url || '/peggy/',
      }
      const push = await sendWebPush(row.subscription, payload)
      if (push.ok) {
        sentIds.push(row.id)
        // Keep future reminders, remove sent ones
        reminderUpdates.push({
          id: row.id,
          remaining: future.length > 0 ? future : null,
        })
        continue
      }
      if (isSubscriptionGoneStatus(push.statusCode)) {
        staleIds.push(row.id)
      }
    } else {
      // --- No schedule: fallback generic notification (rate-limited) ---
      if (!shouldDispatch(row, nowMs, minIntervalMinutes)) continue
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
  }

  // Update last_push_at for all sent rows
  if (sentIds.length > 0) {
    await service
      .from('push_subscriptions')
      .update({
        last_push_at: nowIso,
        updated_at: nowIso,
      })
      .in('id', sentIds)
  }

  // Update pending_reminders per row: keep future, clear sent
  for (const upd of reminderUpdates) {
    await service
      .from('push_subscriptions')
      .update({
        pending_reminders: upd.remaining,
        updated_at: nowIso,
      })
      .eq('id', upd.id)
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
    sent: sentIds.length,
    scheduled_sent: reminderUpdates.length,
    stale: staleIds.length,
    minIntervalMinutes,
  })
})
