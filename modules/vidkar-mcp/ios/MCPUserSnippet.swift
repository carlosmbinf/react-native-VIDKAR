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

struct VIDKARReadSnippetView: View {
  let title: String
  let subtitle: String
  let lines: [String]

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text(verbatim: title).font(.headline)
      if !subtitle.isEmpty {
        Text(verbatim: subtitle).font(.subheadline).foregroundStyle(.secondary)
      }
      ForEach(Array(lines.enumerated()), id: \.offset) { _, line in
        Text(verbatim: line).font(.body).fixedSize(horizontal: false, vertical: true)
      }
    }
    .padding(20)
    .frame(maxWidth: .infinity, alignment: .leading)
    .privacySensitive()
  }
}

private struct VIDKARUserServiceSnippetView: View {
  let title: String
  let symbol: String
  let usage: VIDKARUserProfileDetails.Usage

  var body: some View {
    VStack(alignment: .leading, spacing: 7) {
      HStack {
        Label(title, systemImage: symbol).font(.subheadline.weight(.semibold))
        Spacer()
        if let active = usage.active {
          HStack(spacing: 5) {
            Circle().fill(active ? Color.green : Color.secondary)
              .frame(width: 5, height: 5).accessibilityHidden(true)
            Text(active ? "Activo" : "Inactivo")
              .font(.caption.weight(.medium))
              .foregroundStyle(.primary)
          }
        }
      }
      Text(verbatim: usage.consumption).font(.subheadline).monospacedDigit()
      if let connected = usage.connected {
        Text(connected ? "Conectado" : "Sin conexión")
          .font(.caption).foregroundStyle(.secondary)
      }
      if let expires = usage.expirationDate {
        HStack {
          Text("Vencimiento")
          Spacer()
          Text(expires, format: .dateTime.day().month().year())
        }
        .font(.caption).foregroundStyle(.secondary)
      }
    }
    .padding(12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(.primary.opacity(0.035), in: RoundedRectangle(cornerRadius: 14))
  }
}

struct VIDKARUserSnippetView: View {
  let fullName: String
  let username: String
  let avatar: CGImage?
  let avatarUnavailable: Bool
  var details: VIDKARUserProfileDetails? = nil

  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      HStack {
        Label("Usuario VIDKAR", systemImage: "person.text.rectangle")
          .font(.caption.weight(.semibold))
          .foregroundStyle(.secondary)
        Spacer()
        if let banned = details?.banned {
          Text(banned ? "Bloqueado" : "Sin bloqueo")
            .font(.caption2.weight(.semibold))
            .foregroundStyle(.primary)
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background((banned ? Color.orange : Color.green).opacity(0.1), in: Capsule())
        }
      }
      HStack(alignment: .top, spacing: 16) {
        Group {
          if let avatar {
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
        .frame(width: 64, height: 64)
        .clipShape(Circle())
        .overlay(Circle().strokeBorder(.primary.opacity(0.08), lineWidth: 1))
        .accessibilityHidden(true)
        VStack(alignment: .leading, spacing: 6) {
          Text(verbatim: fullName.isEmpty ? "@\(username)" : fullName)
            .font(.headline)
            .lineLimit(3)
          Text(verbatim: "@\(username)")
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .lineLimit(2)
          if let role = details?.role {
            Text(verbatim: String(role.prefix(60)))
              .font(.caption.weight(.medium))
              .foregroundStyle(.secondary)
          }
        }
      }
      if let details {
        Divider()
        if let memberSince = details.memberSince {
          HStack {
            Text("Miembro desde").foregroundStyle(.secondary)
            Spacer()
            Text(memberSince, format: .dateTime.day().month().year())
          }
          .font(.caption)
        }
        if let emailCount = details.emailCount {
          HStack {
            Text("Correos registrados").foregroundStyle(.secondary)
            Spacer()
            Text(verbatim: String(emailCount)).monospacedDigit()
          }
          .font(.caption)
        }
        if let proxy = details.serviceUsage?.proxy {
          VIDKARUserServiceSnippetView(title: "Proxy", symbol: "network", usage: proxy)
        }
        if let vpn = details.serviceUsage?.vpn {
          VIDKARUserServiceSnippetView(title: "VPN", symbol: "shield.lefthalf.filled", usage: vpn)
        }
      }
      if avatarUnavailable {
        Text("Foto de perfil no disponible")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }

    .padding(20)
    .frame(maxWidth: .infinity, alignment: .leading)
    .privacySensitive()
  }
}
