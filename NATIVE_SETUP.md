# Peggy Native Setup (iOS)

This project now includes a native-capable location bridge.
Web stays supported, but true background tracking requires native iOS build.

## 1. Prerequisites

- Mac with Xcode installed
- Apple Developer account (for install on real device)
- Node.js + npm

## 2. Build + Sync Capacitor

From `app`:

```bash
npm install
npm run native:add:ios
npm run native:ios
```

Notes:
- `native:add:ios` is needed only once (first time).
- `native:ios` builds web assets, syncs Capacitor, then opens Xcode project.

## 3. Xcode Configuration (Required)

Open the iOS project in Xcode, then:

1. `Signing & Capabilities`
- Select your Team and Bundle Identifier.

2. Add Background capability
- `+ Capability` -> `Background Modes`
- Enable `Location updates`.

3. Add iOS permission strings in `Info.plist`
- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysAndWhenInUseUsageDescription`
- Optional compatibility key: `NSLocationAlwaysUsageDescription`

Suggested text:
- `We use your location to auto-log work attendance.`
- `We continue location tracking in the background for attendance reminders.`

## 4. Device Permission Flow

On first run, allow:
- Location While Using
- Then upgrade to Always (from app prompt/settings)

Without "Always", background auto-log will be limited.

## 5. Runtime Behavior

- Native iOS mode: background-capable location updates.
- Web mode: foreground-only (Peggy must be open).

Health tab now shows the active tracking mode so you can verify.

## 6. Widget Continuation

For home-screen/lock-screen widget setup, follow private docs:

- `../_private/docs/2026-02-09-native-widget-setup.md`
- `../_private/docs/2026-02-09-windows-iphone-playbook.md`

Template files are included in:

- `native/widgetkit-template/`
