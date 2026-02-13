import webpush from 'npm:web-push@3.6.7'

let vapidConfigured = false

function ensureVapidConfig() {
  if (vapidConfigured) return
  const publicKey = Deno.env.get('WEB_PUSH_PUBLIC_KEY') || ''
  const privateKey = Deno.env.get('WEB_PUSH_PRIVATE_KEY') || ''
  const contact = Deno.env.get('WEB_PUSH_CONTACT_EMAIL') || 'mailto:admin@example.com'

  if (!publicKey || !privateKey) {
    throw new Error('Missing WEB_PUSH_PUBLIC_KEY/WEB_PUSH_PRIVATE_KEY secrets.')
  }

  webpush.setVapidDetails(contact, publicKey, privateKey)
  vapidConfigured = true
}

export function isSubscriptionGoneStatus(statusCode: number) {
  return statusCode === 404 || statusCode === 410
}

function sanitizeTopic(raw: unknown) {
  const text = String(raw || '').trim().toLowerCase()
  const compact = text.replace(/[^a-z0-9\-_.]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
  if (!compact) return ''
  return compact.slice(0, 32)
}

function deriveTopic(payload: Record<string, unknown>) {
  const reminders = Array.isArray(payload?.reminders) ? payload.reminders : []
  const firstReminder = reminders[0] && typeof reminders[0] === 'object'
    ? reminders[0] as Record<string, unknown>
    : null
  const reminderTag = sanitizeTopic(firstReminder?.tag)
  if (reminderTag) return reminderTag

  const directTag = sanitizeTopic(payload?.tag)
  if (directTag) return directTag

  const now = new Date()
  return sanitizeTopic(`peggy-${now.toISOString().slice(0, 16)}`) || 'peggy-reminder'
}

export async function sendWebPush(subscription: Record<string, unknown>, payload: Record<string, unknown>) {
  ensureVapidConfig()
  const topic = deriveTopic(payload)
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 86400,
      urgency: 'high',
      topic,
    })
    return { ok: true, statusCode: 201 }
  } catch (error) {
    const statusCode = Number((error as { statusCode?: number })?.statusCode || 0)
    const message = String((error as { message?: string })?.message || error || 'Push send failed')
    return { ok: false, statusCode, message }
  }
}
