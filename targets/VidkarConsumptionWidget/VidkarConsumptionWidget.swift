import Foundation
import SwiftUI
import WidgetKit

private let widgetSuite = "group.com.vidkar.shared"
private let widgetDataKey = "vidkar.consumption.widget.v1"

struct ConsumptionSnapshot: Codable {
    let username: String?
    let updatedAt: Date?
    let proxy: Usage
    let vpn: Usage

    struct Usage: Codable {
        let enabled: Bool
        let usedMB: Double
        let limitMB: Double
        let unlimited: Bool
    }
}

struct ConsumptionEntry: TimelineEntry {
    let date: Date
    let snapshot: ConsumptionSnapshot?
}

struct ConsumptionProvider: TimelineProvider {
    func placeholder(in context: Context) -> ConsumptionEntry {
        ConsumptionEntry(date: Date(), snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (ConsumptionEntry) -> Void) {
        completion(ConsumptionEntry(date: Date(), snapshot: loadSnapshot()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ConsumptionEntry>) -> Void) {
        let entry = ConsumptionEntry(date: Date(), snapshot: loadSnapshot())
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func loadSnapshot() -> ConsumptionSnapshot? {
        guard let data = UserDefaults(suiteName: widgetSuite)?.data(forKey: widgetDataKey) else {
            return nil
        }
        return try? JSONDecoder().decode(ConsumptionSnapshot.self, from: data)
    }
}

struct ConsumptionWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ConsumptionEntry

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "#12203B"), Color(hex: "#07101D")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            if let snapshot = entry.snapshot {
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("VIDKAR")
                                .font(.system(size: 11, weight: .bold, design: .rounded))
                                .foregroundColor(.cyan)
                            Text(snapshot.username.map { "Consumo de \($0)" } ?? "Consumo de servicios")
                                .font(.system(size: 10, weight: .semibold, design: .rounded))
                                .foregroundColor(.white.opacity(0.86))
                                .lineLimit(1)
                        }
                        Spacer()
                        Image(systemName: "chart.bar.fill")
                            .foregroundColor(.white.opacity(0.7))
                    }

                    HStack(spacing: 8) {
                        UsageCard(title: "PROXY", usage: snapshot.proxy, tint: .cyan)
                        UsageCard(title: "VPN", usage: snapshot.vpn, tint: .purple)
                    }

                    Text("Actualizado \(snapshot.updatedAt ?? entry.date, style: .relative)")
                        .font(.system(size: 8, weight: .medium, design: .rounded))
                        .foregroundColor(.white.opacity(0.55))
                }
                .padding(14)
            } else {
                VStack(spacing: 8) {
                    Image(systemName: "wifi.exclamationmark")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(.cyan)
                    Text("Abre VIDKAR para sincronizar tu consumo")
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .multilineTextAlignment(.center)
                        .foregroundColor(.white.opacity(0.85))
                }
                .padding(16)
            }
        }
        .background {
            Color(hex: "#07101D")
        }
    }
}

private struct UsageCard: View {
    let title: String
    let usage: ConsumptionSnapshot.Usage
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 8, weight: .bold, design: .rounded))
                .foregroundColor(tint)
            Text(usage.label)
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            ProgressView(value: usage.progress)
                .tint(tint)
        }
        .padding(9)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private extension ConsumptionSnapshot.Usage {
    var progress: Double {
        guard !unlimited, limitMB > 0 else { return 0 }
        return min(max(usedMB / limitMB, 0), 1)
    }

    var label: String {
        guard enabled else { return "Inactivo" }
        if unlimited { return "Ilimitado" }
        return "\(format(usedMB)) / \(format(limitMB)) MB"
    }

    func format(_ value: Double) -> String {
        value >= 100 ? String(format: "%.0f", value) : String(format: "%.1f", value)
    }
}

private extension ConsumptionSnapshot {
    static let placeholder = ConsumptionSnapshot(
        username: "usuario",
        updatedAt: Date(),
        proxy: Usage(enabled: true, usedMB: 420, limitMB: 2048, unlimited: false),
        vpn: Usage(enabled: true, usedMB: 180, limitMB: 1024, unlimited: false)
    )
}

private extension Color {
    init(hex: String) {
        let value = UInt64(hex.dropFirst(), radix: 16) ?? 0
        self.init(
            red: Double((value >> 16) & 0xff) / 255,
            green: Double((value >> 8) & 0xff) / 255,
            blue: Double(value & 0xff) / 255
        )
    }
}

@main
struct VidkarConsumptionWidgetBundle: WidgetBundle {
    var body: some Widget {
        StaticConfiguration(
            kind: "VidkarConsumptionWidget",
            provider: ConsumptionProvider(),
            content: { entry in
            ConsumptionWidgetView(entry: entry)
            }
        )
        .configurationDisplayName("Consumo Proxy y VPN")
        .description("Consulta rápidamente tu consumo de Proxy y VPN.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
