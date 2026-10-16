import Foundation
import ImageIO
import SwiftUI

func validatedVIDKARUserAvatarURL(_ rawValue: String?) -> URL? {
  guard let rawValue, rawValue.utf8.count <= 2048,
        let components = URLComponents(string: rawValue),
        components.scheme?.lowercased() == "https",
        components.user == nil, components.password == nil,
        components.port == nil || components.port == 443,
        let host = components.host?.lowercased(),
        ["vidkar.com", "googleusercontent.com", "facebook.com", "fbcdn.net", "fbsbx.com"].contains(where: {
          host == $0 || host.hasSuffix(".\($0)")
        }),
        let url = components.url else { return nil }
  return url
}

func validatedVIDKAROpenLink(_ rawValue: String?) -> URL? {
  guard let rawValue, rawValue.utf8.count <= 512,
        let components = URLComponents(string: rawValue),
        components.scheme?.lowercased() == "vidkar",
        components.user == nil, components.password == nil,
        components.port == nil, components.fragment == nil,
        let host = components.host?.lowercased(),
        ["user", "movie", "series", "episode", "course", "lesson", "product", "sale", "purchase", "order", "message", "subscription", "search"].contains(host),
        let url = components.url else { return nil }
  if host != "search" && host != "message" {
    guard components.path.split(separator: "/").count == 1 else { return nil }
  }
  return url
}

func validatedVIDKARInAppSearchLink(query: String, entityType: String = "all") -> URL? {
  let cleanQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
  guard cleanQuery.utf16.count <= 120,
        !cleanQuery.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }),
        ["all", "user", "movie", "series", "episode", "course", "lesson", "product", "sale", "purchase", "order", "message", "subscription"].contains(entityType) else {
    return nil
  }
  var components = URLComponents()
  components.scheme = "vidkar"
  components.host = "search"
  var items: [URLQueryItem] = []
  if !cleanQuery.isEmpty { items.append(URLQueryItem(name: "q", value: cleanQuery)) }
  items.append(URLQueryItem(name: "entity", value: entityType))
  components.queryItems = items
  components.percentEncodedQuery = components.percentEncodedQuery?.replacingOccurrences(of: "+", with: "%2B")
  return components.url
}

enum VIDKARUserAvatar {
  static let maximumBytes = 1_048_576

  struct LoadedImage {
    let data: Data
    let image: CGImage
  }

  enum Failure: Error, Equatable {
    case invalidResponse
    case tooLarge
    case invalidImage
  }

  final class RedirectDelegate: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
      completionHandler(validatedVIDKARUserAvatarURL(request.url?.absoluteString) == nil ? nil : request)
    }
  }

  static func load(from url: URL) async throws -> LoadedImage {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.urlCache = nil
    configuration.urlCredentialStorage = nil
    configuration.httpCookieStorage = nil
    configuration.httpShouldSetCookies = false
    configuration.timeoutIntervalForResource = 8
    let session = URLSession(configuration: configuration, delegate: RedirectDelegate(), delegateQueue: nil)
    defer { session.invalidateAndCancel() }
    return try await load(from: url, using: session)
  }

  static func load(from url: URL, using session: URLSession) async throws -> LoadedImage {
    try Task.checkCancellation()
    guard validatedVIDKARUserAvatarURL(url.absoluteString) != nil else { throw Failure.invalidResponse }
    var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 5)
    request.setValue("image/*", forHTTPHeaderField: "Accept")
    let (bytes, response) = try await session.bytes(for: request)
    guard let response = response as? HTTPURLResponse, response.statusCode == 200,
          validatedVIDKARUserAvatarURL(response.url?.absoluteString) != nil,
          response.mimeType?.hasPrefix("image/") == true else { throw Failure.invalidResponse }
    guard response.expectedContentLength <= maximumBytes else { throw Failure.tooLarge }
    var data = Data()
    for try await byte in bytes {
      try Task.checkCancellation()
      guard data.count < maximumBytes else { throw Failure.tooLarge }
      data.append(byte)
    }
    return try decode(data)
  }

  static func decode(_ data: Data) throws -> LoadedImage {
    guard data.count <= maximumBytes else { throw Failure.tooLarge }
    guard let source = CGImageSourceCreateWithData(data as CFData, nil),
          let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
          let width = properties[kCGImagePropertyPixelWidth] as? Int,
          let height = properties[kCGImagePropertyPixelHeight] as? Int,
          width > 0, height > 0, width <= 4096, height <= 4096,
          let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: 128,
            kCGImageSourceShouldCacheImmediately: true,
          ] as CFDictionary) else { throw Failure.invalidImage }
    let output = NSMutableData()
    guard let destination = CGImageDestinationCreateWithData(output, "public.png" as CFString, 1, nil) else {
      throw Failure.invalidImage
    }
    CGImageDestinationAddImage(destination, image, nil)
    guard CGImageDestinationFinalize(destination) else { throw Failure.invalidImage }
    return LoadedImage(data: output as Data, image: image)
  }
}

struct VIDKARUserProfileDetails: Decodable, Sendable {
  struct Usage: Decodable, Sendable {
    var active: Bool?
    var connected: Bool?
    var usedBytes: Double?
    var limitMB: Double?
    var unlimited: Bool?
    var expiresAt: String?

    var expirationDate: Date? { VIDKARUserProfileDetails.date(expiresAt) }
    var consumption: String {
      guard let usedBytes else { return "Consumo no disponible" }
      let used = ByteCountFormatter.string(fromByteCount: Int64(usedBytes), countStyle: .binary)
      if unlimited == true { return "\(used) · ilimitado" }
      guard let limitMB else { return "\(used) · límite no disponible" }
      return "\(used) / \(limitMB.formatted(.number)) MB"
    }
  }
  struct Services: Decodable, Sendable {
    var proxy: Usage?
    var vpn: Usage?
  }
  var role: String?
  var createdAt: String?
  var emailCount: Int?
  var banned: Bool?
  var serviceUsage: Services?

  var memberSince: Date? { Self.date(createdAt) }

  static func decode(_ payload: [String: Any]) throws -> Self {
    let data = try JSONSerialization.data(withJSONObject: payload)
    let details = try JSONDecoder().decode(Self.self, from: data)
    guard details.emailCount.map({ $0 >= 0 }) ?? true,
          details.createdAt == nil || details.memberSince != nil else { throw Failure.invalidProfile }
    for usage in [details.serviceUsage?.proxy, details.serviceUsage?.vpn].compactMap({ $0 }) {
      guard usage.usedBytes.map({ $0.isFinite && $0 >= 0 && $0 < Double(Int64.max) }) ?? true,
            usage.limitMB.map({ $0.isFinite && $0 >= 0 }) ?? true,
            usage.expiresAt == nil || usage.expirationDate != nil else { throw Failure.invalidProfile }
    }
    return details
  }

  enum Failure: LocalizedError {
    case invalidProfile
    var errorDescription: String? { "VIDKAR devolvió datos de perfil no válidos." }
  }

  static func date(_ value: String?) -> Date? {
    guard let value else { return nil }
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter.date(from: value) ?? ISO8601DateFormatter().date(from: value)
  }
}

struct VIDKARSnippetItem: Sendable {
  let id: String
  let title: String
  let subtitle: String
  let detail: String
  let badge: String?
  let symbolName: String
  let image: CGImage?
  let circularImage: Bool
  let openURL: URL?

  init(
    id: String,
    title: String,
    subtitle: String = "",
    detail: String = "",
    badge: String? = nil,
    symbolName: String = "square.grid.2x2",
    image: CGImage? = nil,
    circularImage: Bool = false,
    openURL: URL? = nil
  ) {
    self.id = id
    self.title = title
    self.subtitle = subtitle
    self.detail = detail
    self.badge = badge
    self.symbolName = symbolName
    self.image = image
    self.circularImage = circularImage
    self.openURL = openURL
  }
}

private struct VIDKARSnippetRowContentView: View {
  let item: VIDKARSnippetItem

  var body: some View {
    HStack(alignment: .center, spacing: 10) {
      Group {
        if let image = item.image {
          Image(decorative: image, scale: 1)
            .resizable()
            .scaledToFill()
        } else {
          Image(systemName: item.symbolName)
            .resizable()
            .scaledToFit()
            .padding(8)
            .foregroundStyle(.secondary)
            .background(.primary.opacity(0.05))
        }
      }
      .frame(width: 40, height: 40)
      .clipShape(RoundedRectangle(cornerRadius: item.circularImage ? 20 : 8))
      .overlay(
        RoundedRectangle(cornerRadius: item.circularImage ? 20 : 8)
          .strokeBorder(.primary.opacity(0.08), lineWidth: 1)
      )
      .accessibilityHidden(true)

      VStack(alignment: .leading, spacing: 2) {
        HStack(spacing: 6) {
          Text(verbatim: item.title)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.primary)
            .lineLimit(1)
          Spacer(minLength: 4)
          if let badge = item.badge, !badge.isEmpty {
            Text(verbatim: badge)
              .font(.caption2.weight(.semibold))
              .foregroundStyle(.secondary)
              .padding(.horizontal, 6)
              .padding(.vertical, 2)
              .background(.primary.opacity(0.06), in: Capsule())
              .lineLimit(1)
          }
        }
        if !item.subtitle.isEmpty {
          Text(verbatim: item.subtitle)
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
        if !item.detail.isEmpty {
          Text(verbatim: item.detail)
            .font(.caption2)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
      }

      if item.openURL != nil {
        Image(systemName: "chevron.right")
          .font(.caption.weight(.semibold))
          .foregroundStyle(.tertiary)
          .accessibilityHidden(true)
      }
    }
    .padding(.horizontal, 10)
    .padding(.vertical, 8)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(.primary.opacity(0.035), in: RoundedRectangle(cornerRadius: 12))
  }
}

struct VIDKAREntityListSnippetView: View {
  let title: String
  let subtitle: String
  let items: [VIDKARSnippetItem]
  var searchURL: URL? = nil

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(alignment: .firstTextBaseline) {
        VStack(alignment: .leading, spacing: 2) {
          Text(verbatim: title).font(.subheadline.weight(.semibold))
          if !subtitle.isEmpty {
            Text(verbatim: subtitle).font(.caption).foregroundStyle(.secondary)
          }
        }
        Spacer()
        if let searchURL {
          Link(destination: searchURL) {
            HStack(spacing: 4) {
              Text("Ver en la app")
              Image(systemName: "arrow.up.forward.app")
            }
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(.primary.opacity(0.06), in: Capsule())
          }
          .buttonStyle(.plain)
        }
      }
      if items.isEmpty {
        Text("No encontré resultados.")
          .font(.caption)
          .foregroundStyle(.secondary)
      } else {
        ForEach(Array(items.prefix(5).enumerated()), id: \.offset) { _, item in
          if let openURL = item.openURL {
            Link(destination: openURL) {
              VIDKARSnippetRowContentView(item: item)
            }
            .buttonStyle(.plain)
          } else {
            VIDKARSnippetRowContentView(item: item)
          }
        }
      }
    }
    .padding(14)
    .frame(maxWidth: .infinity, alignment: .leading)
    .privacySensitive()
  }
}

struct VIDKARReadSnippetView: View {
  let title: String
  let subtitle: String
  let lines: [String]
  var items: [VIDKARSnippetItem] = []
  var searchURL: URL? = nil

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .firstTextBaseline) {
        VStack(alignment: .leading, spacing: 2) {
          Text(verbatim: title).font(.headline)
          if !subtitle.isEmpty {
            Text(verbatim: subtitle).font(.subheadline).foregroundStyle(.secondary)
          }
        }
        Spacer()
        if let searchURL {
          Link(destination: searchURL) {
            HStack(spacing: 4) {
              Text("Ver en la app")
              Image(systemName: "arrow.up.forward.app")
            }
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(.primary.opacity(0.06), in: Capsule())
          }
          .buttonStyle(.plain)
        }
      }
      if !items.isEmpty {
        if let firstLine = lines.first, lines.count > items.count {
          Text(verbatim: firstLine)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        ForEach(Array(items.prefix(5).enumerated()), id: \.offset) { _, item in
          if let openURL = item.openURL {
            Link(destination: openURL) {
              VIDKARSnippetRowContentView(item: item)
            }
            .buttonStyle(.plain)
          } else {
            VIDKARSnippetRowContentView(item: item)
          }
        }
      } else {
        ForEach(Array(lines.enumerated()), id: \.offset) { _, line in
          Text(verbatim: line).font(.body).fixedSize(horizontal: false, vertical: true)
        }
      }
    }
    .padding(14)
    .frame(maxWidth: .infinity, alignment: .leading)
    .privacySensitive()
  }
}

private struct VIDKARUserServiceSnippetView: View {
  let title: String
  let symbol: String
  let usage: VIDKARUserProfileDetails.Usage

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack {
        Label(title, systemImage: symbol).font(.caption.weight(.semibold))
        Spacer()
        if let active = usage.active {
          HStack(spacing: 4) {
            Circle().fill(active ? Color.green : Color.secondary)
              .frame(width: 5, height: 5).accessibilityHidden(true)
            Text(active ? "Activo" : "Inactivo")
              .font(.caption2.weight(.medium))
              .foregroundStyle(.primary)
          }
        }
      }
      Text(verbatim: usage.consumption).font(.caption).monospacedDigit().lineLimit(1)
      HStack(spacing: 6) {
        if let connected = usage.connected {
          Text(connected ? "Conectado" : "Sin conexión")
            .font(.caption2).foregroundStyle(.secondary)
        }
        if let expires = usage.expirationDate {
          Spacer(minLength: 4)
          Text(expires, format: .dateTime.day().month().year())
            .font(.caption2).foregroundStyle(.secondary)
        }
      }
    }
    .padding(8)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(.primary.opacity(0.035), in: RoundedRectangle(cornerRadius: 10))
  }
}

struct VIDKARUserSnippetRow: Sendable {
  let fullName: String
  let username: String
  let avatar: CGImage?
  let avatarUnavailable: Bool
  var details: VIDKARUserProfileDetails? = nil
  var openURL: URL? = nil
}

private struct VIDKARUserCompactCardContentView: View {
  let row: VIDKARUserSnippetRow

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(alignment: .center, spacing: 10) {
        Group {
          if let avatar = row.avatar {
            Image(decorative: avatar, scale: 1)
              .resizable()
              .scaledToFill()
          } else {
            Image(systemName: "person.crop.circle.fill")
              .resizable()
              .scaledToFit()
              .foregroundStyle(.secondary)
          }
        }
        .frame(width: 44, height: 44)
        .clipShape(Circle())
        .overlay(Circle().strokeBorder(.primary.opacity(0.08), lineWidth: 1))
        .accessibilityHidden(true)

        VStack(alignment: .leading, spacing: 2) {
          HStack(spacing: 6) {
            Text(verbatim: row.fullName.isEmpty ? "@\(row.username)" : row.fullName)
              .font(.subheadline.weight(.semibold))
              .foregroundStyle(.primary)
              .lineLimit(1)
            Spacer(minLength: 4)
            if let banned = row.details?.banned {
              Text(banned ? "Bloqueado" : "Sin bloqueo")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.primary)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background((banned ? Color.orange : Color.green).opacity(0.12), in: Capsule())
            }
          }
          HStack(spacing: 6) {
            Text(verbatim: "@\(row.username)")
              .font(.caption)
              .foregroundStyle(.secondary)
              .lineLimit(1)
            if let role = row.details?.role, !role.isEmpty {
              Text(verbatim: "· \(String(role.prefix(40)))")
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }
            Spacer(minLength: 4)
            if row.openURL != nil {
              Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.tertiary)
                .accessibilityHidden(true)
            }
          }
        }
      }

      if let details = row.details {
        HStack(spacing: 10) {
          if let memberSince = details.memberSince {
            HStack(spacing: 4) {
              Text("Miembro desde").foregroundStyle(.secondary)
              Text(memberSince, format: .dateTime.day().month().year())
            }
            .font(.caption2)
          }
          if let emailCount = details.emailCount {
            HStack(spacing: 4) {
              Text("Correos registrados").foregroundStyle(.secondary)
              Text(verbatim: String(emailCount)).monospacedDigit()
            }
            .font(.caption2)
          }
        }
        if details.serviceUsage?.proxy != nil || details.serviceUsage?.vpn != nil {
          HStack(alignment: .top, spacing: 8) {
            if let proxy = details.serviceUsage?.proxy {
              VIDKARUserServiceSnippetView(title: "Proxy", symbol: "network", usage: proxy)
            }
            if let vpn = details.serviceUsage?.vpn {
              VIDKARUserServiceSnippetView(title: "VPN", symbol: "shield.lefthalf.filled", usage: vpn)
            }
          }
        }
      }
      if row.avatarUnavailable {
        Text("Foto de perfil no disponible")
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
    }
    .padding(10)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(.primary.opacity(0.03), in: RoundedRectangle(cornerRadius: 12))
  }
}

struct VIDKARUserSnippetView: View {
  let fullName: String
  let username: String
  let avatar: CGImage?
  let avatarUnavailable: Bool
  var details: VIDKARUserProfileDetails? = nil
  var openURL: URL? = nil
  var additionalRows: [VIDKARUserSnippetRow] = []
  var searchURL: URL? = nil

  private var allRows: [VIDKARUserSnippetRow] {
    [VIDKARUserSnippetRow(
      fullName: fullName,
      username: username,
      avatar: avatar,
      avatarUnavailable: avatarUnavailable,
      details: details,
      openURL: openURL
    )] + additionalRows
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Label("Usuario VIDKAR", systemImage: "person.text.rectangle")
          .font(.caption.weight(.semibold))
          .foregroundStyle(.secondary)
        Spacer()
        if let searchURL {
          Link(destination: searchURL) {
            HStack(spacing: 4) {
              Text("Ver en la app")
              Image(systemName: "arrow.up.forward.app")
            }
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(.primary.opacity(0.06), in: Capsule())
          }
          .buttonStyle(.plain)
        }
      }

      ForEach(Array(allRows.prefix(5).enumerated()), id: \.offset) { _, row in
        if let rowURL = row.openURL {
          Link(destination: rowURL) {
            VIDKARUserCompactCardContentView(row: row)
          }
          .buttonStyle(.plain)
        } else {
          VIDKARUserCompactCardContentView(row: row)
        }
      }
    }
    .padding(12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .privacySensitive()
  }
}
