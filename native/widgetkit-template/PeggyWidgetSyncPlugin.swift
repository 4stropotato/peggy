import Foundation
import Capacitor
import WidgetKit

@objc(PeggyWidgetSyncPlugin)
public class PeggyWidgetSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PeggyWidgetSyncPlugin"
    public let jsName = "PeggyWidgetSync"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reloadTimelines", returnType: CAPPluginReturnPromise)
    ]

    // Replace with your real App Group id.
    private let appGroupId = "group.io.peggy.app"
    private let snapshotKey = "peggy.widget.snapshot"

    @objc func setSnapshot(_ call: CAPPluginCall) {
        guard let snapshot = call.getObject("snapshot") else {
            call.reject("Missing snapshot payload.")
            return
        }

        guard let defaults = UserDefaults(suiteName: appGroupId) else {
            call.reject("App Group UserDefaults not available.")
            return
        }

        defaults.set(snapshot, forKey: snapshotKey)
        defaults.set(Date().timeIntervalSince1970, forKey: "peggy.widget.snapshot.updatedAt")
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func reloadTimelines(_ call: CAPPluginCall) {
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}

