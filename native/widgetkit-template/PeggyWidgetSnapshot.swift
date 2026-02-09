import Foundation

struct PeggyWidgetSnapshot: Codable {
    let updatedAt: String
    let dueDate: String
    let daysUntilDue: Int
    let weeksPregnant: Int
    let supplementsTaken: Int
    let supplementsTotal: Int
    let checkupsDone: Int
    let checkupsTotal: Int
    let openTasks: Int
    let attendedToday: Bool
    let reminderText: String
}

enum PeggyWidgetStore {
    // Replace with your real App Group id.
    static let appGroupId = "group.io.peggy.app"
    static let snapshotKey = "peggy.widget.snapshot"

    static func loadSnapshot() -> PeggyWidgetSnapshot {
        guard let defaults = UserDefaults(suiteName: appGroupId),
              let raw = defaults.dictionary(forKey: snapshotKey) else {
            return fallback()
        }

        func intValue(_ key: String, _ fallback: Int = 0) -> Int {
            if let num = raw[key] as? NSNumber {
                return num.intValue
            }
            if let str = raw[key] as? String, let parsed = Int(str) {
                return parsed
            }
            return fallback
        }

        return PeggyWidgetSnapshot(
            updatedAt: raw["updatedAt"] as? String ?? ISO8601DateFormatter().string(from: Date()),
            dueDate: raw["dueDate"] as? String ?? "",
            daysUntilDue: intValue("daysUntilDue"),
            weeksPregnant: intValue("weeksPregnant"),
            supplementsTaken: intValue("supplementsTaken"),
            supplementsTotal: max(1, intValue("supplementsTotal", 1)),
            checkupsDone: intValue("checkupsDone"),
            checkupsTotal: max(1, intValue("checkupsTotal", 1)),
            openTasks: max(0, intValue("openTasks")),
            attendedToday: raw["attendedToday"] as? Bool ?? false,
            reminderText: raw["reminderText"] as? String ?? "Open Peggy for details."
        )
    }

    private static func fallback() -> PeggyWidgetSnapshot {
        PeggyWidgetSnapshot(
            updatedAt: ISO8601DateFormatter().string(from: Date()),
            dueDate: "",
            daysUntilDue: 0,
            weeksPregnant: 0,
            supplementsTaken: 0,
            supplementsTotal: 1,
            checkupsDone: 0,
            checkupsTotal: 1,
            openTasks: 0,
            attendedToday: false,
            reminderText: "Open Peggy for details."
        )
    }
}

