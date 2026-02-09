# Peggy Windows + iPhone Playbook

Last updated: 2026-02-09

This is the working plan if you only have:
- Windows machine
- iPhone device
- no Mac for now

## 1. Current Status

### Works now (Windows only)
- Peggy web app via GitHub Pages (`https://4stropotato.github.io/peggy/`)
- Supabase auth + per-account data isolation
- Cloud sync behavior tied to account
- PWA install on iPhone home screen
- Web notifications (browser/PWA limitations apply)

### Not possible on Windows only
- Local iOS native build (Capacitor iOS requires macOS + Xcode)
- Real WidgetKit widgets
- Fully reliable native background location tracking when app is closed

## 2. Daily Workflow (No Mac)

1. Develop on Windows in `app`:
- `npm run dev`

2. Validate production build:
- `npm run build`

3. Push code:
- `git add ...`
- `git commit -m \"...\"`
- `git push origin main`

4. Deploy web app:
- `npm run deploy`

5. On iPhone:
- Open Safari to live URL
- Add to Home Screen (if needed)
- Re-open app and verify latest changes

## 3. Notification Reality Check on iPhone (PWA)

- Notifications depend on iOS web/PWA support and user permission.
- Quiet hours and cadence logic are in-app and account-bound.
- If user/device blocks web notifications, reminders still show in-app cards and app badge logic where supported.
- Background behavior for web app is limited compared with native app.

## 4. Native Plan (Deferred Until Mac or Cloud Native Build)

Prepared already in repo:
- `NATIVE_SETUP.md`
- `NATIVE_WIDGET_SETUP.md`
- `src/native/locationBridge.js`
- `src/native/widgetBridge.js`
- `src/components/WidgetSyncAgent.jsx`
- `native/widgetkit-template/`

When Mac is available:
1. `npm run native:add:ios` (one-time)
2. `npm run native:sync`
3. Open Xcode and configure signing/capabilities
4. Add App Group for app + widget extension
5. Wire WidgetKit template files
6. Test on real iPhone

## 5. If Using Cloud Native Build Later

- You can prepare build config from Windows.
- For real iPhone native install/distribution, Apple Developer membership is still required.
- Keep this as Phase 2 after PWA is stable.
- Owner action list is here:
- `CLOUD_NATIVE_BUILD_OWNER_CHECKLIST.md`

## 6. Safety + Recovery Rules

- Keep `_private/changelog` updated per patch.
- Keep forward and revert diffs for every significant app change.
- Before risky patches:
1. `npm run build`
2. backup/export app data if needed
3. create changelog entry first

## 7. Recommended Phase Plan

### Phase A (Now)
- PWA-first reliability
- account sync stability
- notification tuning
- content quality

### Phase B (When Mac/Cloud native is ready)
- native iOS packaging
- WidgetKit enablement
- stronger background location behavior

### Phase C (Release)
- TestFlight/App Store distribution
- long-term telemetry and crash tracking
