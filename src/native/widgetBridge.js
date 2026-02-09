import { Capacitor, registerPlugin } from '@capacitor/core'

const PeggyWidgetSync = registerPlugin('PeggyWidgetSync')

function isNativeIos() {
  try {
    return Capacitor?.isNativePlatform?.() && Capacitor?.getPlatform?.() === 'ios'
  } catch {
    return false
  }
}

function toSafeNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function toSafeString(value) {
  return typeof value === 'string' ? value : String(value ?? '')
}

export function normalizeWidgetSnapshot(input = {}) {
  const dueDate = toSafeString(input.dueDate || '')
  return {
    updatedAt: toSafeString(input.updatedAt || new Date().toISOString()),
    dueDate,
    daysUntilDue: toSafeNumber(input.daysUntilDue, 0),
    weeksPregnant: toSafeNumber(input.weeksPregnant, 0),
    supplementsTaken: toSafeNumber(input.supplementsTaken, 0),
    supplementsTotal: Math.max(1, toSafeNumber(input.supplementsTotal, 1)),
    checkupsDone: toSafeNumber(input.checkupsDone, 0),
    checkupsTotal: Math.max(1, toSafeNumber(input.checkupsTotal, 1)),
    openTasks: Math.max(0, toSafeNumber(input.openTasks, 0)),
    attendedToday: Boolean(input.attendedToday),
    reminderText: toSafeString(input.reminderText || ''),
  }
}

export async function syncWidgetSnapshot(snapshot) {
  if (!isNativeIos()) return { skipped: true, reason: 'not-native-ios' }

  const safe = normalizeWidgetSnapshot(snapshot)
  try {
    await PeggyWidgetSync.setSnapshot({ snapshot: safe })
    return { ok: true }
  } catch {
    return { skipped: true, reason: 'plugin-not-ready' }
  }
}

export async function reloadNativeWidgetTimelines() {
  if (!isNativeIos()) return { skipped: true, reason: 'not-native-ios' }
  try {
    await PeggyWidgetSync.reloadTimelines()
    return { ok: true }
  } catch {
    return { skipped: true, reason: 'plugin-not-ready' }
  }
}

