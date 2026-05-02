import SwiftUI

func clean(_ value: String?) -> String? {
    guard let value else {
        return nil
    }

    let trimmedValue = value.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmedValue.isEmpty ? nil : trimmedValue
}

func formatWatchDate(_ value: String?) -> String? {
    guard let value,
          let date = ISO8601DateFormatter().date(from: value) else {
        return clean(value)
    }

    let formatter = DateFormatter()
    formatter.dateStyle = .short
    formatter.timeStyle = .short
    return formatter.string(from: date)
}

extension Color {
    init(hex: String?) {
        let fallback = Color.blue
        guard let rawHex = clean(hex)?.replacingOccurrences(of: "#", with: "") else {
            self = fallback
            return
        }

        var sanitizedHex = rawHex
        if sanitizedHex.count == 3 {
            sanitizedHex = sanitizedHex.map { "\($0)\($0)" }.joined()
        }

        guard sanitizedHex.count == 6, let value = Int(sanitizedHex, radix: 16) else {
            self = fallback
            return
        }

        self = Color(
            red: Double((value >> 16) & 0xFF) / 255.0,
            green: Double((value >> 8) & 0xFF) / 255.0,
            blue: Double(value & 0xFF) / 255.0
        )
    }
}