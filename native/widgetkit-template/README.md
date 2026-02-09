# WidgetKit Template Files

These are starter templates to continue Peggy native iOS work on Mac/Xcode.

## Files

- `PeggyWidgetSyncPlugin.swift`
- `PeggyWidgetSnapshot.swift`
- `PeggyHomeWidget.swift`

## Usage

1. Create iOS project via Capacitor (`npm run native:add:ios`).
2. In Xcode, add a Widget Extension target.
3. Copy/adapt these files into the appropriate iOS targets.
4. Set one shared App Group id in both app + widget targets.

Default example App Group in templates:
- `group.io.peggy.app`

Change this to your real bundle/app-group id before build.

