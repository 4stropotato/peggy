# Peggy Native Widget Setup (iOS)

This setup continues the native iOS work and adds a home/lock-screen widget path.
The web app keeps working without this, but WidgetKit needs Xcode on Mac.

## 1. Current JS Side (Already Added)

- `src/native/widgetBridge.js`
- `src/components/WidgetSyncAgent.jsx`
- `src/App.jsx` includes `WidgetSyncAgent`

Behavior:
- Peggy now prepares a compact daily snapshot (due progress, supplements, tasks, checkups, attendance).
- On native iOS, it tries to call a Capacitor plugin named `PeggyWidgetSync`.
- On web/non-native, it no-ops safely.

## 2. Generate/Sync iOS Project

From `app`:

```bash
npm install
npm run native:add:ios
npm run native:sync
```

## 3. Create App Group (Required)

In Xcode:

1. Open iOS project.
2. Add `App Groups` capability to:
- main app target
- widget extension target
3. Use the same group id for both, example:
- `group.io.peggy.app`

## 4. Add Capacitor Plugin (Template Provided)

Use template files under:
- `native/widgetkit-template/PeggyWidgetSyncPlugin.swift`

Wire it into iOS app target and ensure plugin is registered per Capacitor iOS plugin conventions.

Important:
- Keep `groupId` in plugin and widget files consistent with your App Group.

## 5. Add Widget Extension (Template Provided)

Use template files:
- `native/widgetkit-template/PeggyWidgetSnapshot.swift`
- `native/widgetkit-template/PeggyHomeWidget.swift`

Create a new Widget Extension target in Xcode, then adapt these files.

## 6. Data Flow

1. React app state changes.
2. `WidgetSyncAgent` builds snapshot.
3. `widgetBridge` calls native plugin:
- `setSnapshot({ snapshot })`
- `reloadTimelines()`
4. Native plugin writes snapshot to shared `UserDefaults` (App Group).
5. Widget reads shared snapshot and renders.

## 7. Quick Validation Checklist

- App runs on iPhone in native build.
- No plugin errors in Xcode console.
- Widget appears in Home Screen widget picker.
- Widget values update after app activity.
- Snapshot updates without forcing app restart.

## 8. Notes

- Widget UI tuning is done in SwiftUI (not in React).
- Lock-screen accessory widgets can be added as a second pass after base widget is stable.
- On Windows, templates/docs can be prepared, but actual WidgetKit build is Mac-only.

