import WidgetKit
import SwiftUI

struct PeggyEntry: TimelineEntry {
    let date: Date
    let snapshot: PeggyWidgetSnapshot
}

struct PeggyProvider: TimelineProvider {
    func placeholder(in context: Context) -> PeggyEntry {
        PeggyEntry(date: Date(), snapshot: PeggyWidgetStore.loadSnapshot())
    }

    func getSnapshot(in context: Context, completion: @escaping (PeggyEntry) -> Void) {
        completion(PeggyEntry(date: Date(), snapshot: PeggyWidgetStore.loadSnapshot()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PeggyEntry>) -> Void) {
        let entry = PeggyEntry(date: Date(), snapshot: PeggyWidgetStore.loadSnapshot())
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct PeggyWidgetView: View {
    let entry: PeggyEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Peggy")
                    .font(.headline)
                Spacer()
                Text("W\(entry.snapshot.weeksPregnant)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }

            Text(entry.snapshot.daysUntilDue >= 0
                ? "\(entry.snapshot.daysUntilDue)d until due"
                : "Delivery window active")
                .font(.caption)

            HStack {
                Label("\(entry.snapshot.supplementsTaken)/\(entry.snapshot.supplementsTotal)", systemImage: "pills")
                Spacer()
                Label("\(entry.snapshot.checkupsDone)/\(entry.snapshot.checkupsTotal)", systemImage: "cross.case")
            }
            .font(.caption2)

            Text(entry.snapshot.reminderText)
                .font(.caption2)
                .lineLimit(2)
                .foregroundStyle(.secondary)
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

struct PeggyHomeWidget: Widget {
    let kind: String = "PeggyHomeWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PeggyProvider()) { entry in
            PeggyWidgetView(entry: entry)
        }
        .configurationDisplayName("Peggy Daily Status")
        .description("Pregnancy summary, supplements, and reminders at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

