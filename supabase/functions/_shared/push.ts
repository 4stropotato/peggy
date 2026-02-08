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

export async function sendWebPush(subscription: Record<string, unknown>, payload: Record<string, unknown>) {
  ensureVapidConfig()
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    return { ok: true, statusCode: 201 }
  } catch (error) {
    const statusCode = Number((error as { statusCode?: number })?.statusCode || 0)
    const message = String((error as { message?: string })?.message || error || 'Push send failed')
    return { ok: false, statusCode, message }
  }
}
