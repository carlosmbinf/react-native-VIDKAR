import Foundation
import ImageIO
import SwiftUI

private final class AvatarProtocol: URLProtocol {
  static var body = Data()
  static var status = 200
  static var mime = "image/png"
  static var length: Int?
  static var calls = 0

  override class func canInit(with request: URLRequest) -> Bool { true }
  override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
  override func startLoading() {
    Self.calls += 1
    precondition(request.value(forHTTPHeaderField: "Authorization") == nil)
    let response = HTTPURLResponse(url: request.url!, statusCode: Self.status, httpVersion: "HTTP/1.1",
      headerFields: ["Content-Type": Self.mime, "Content-Length": String(Self.length ?? Self.body.count)])!
    client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
    client?.urlProtocol(self, didLoad: Self.body)
    client?.urlProtocolDidFinishLoading(self)
  }
  override func stopLoading() {}
}

@main
private struct MCPUserSnippetTests {
  static func png(width: Int, height: Int) -> Data {
    let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8,
      bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    context.setFillColor(CGColor(red: 0.2, green: 0.4, blue: 0.6, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    let data = NSMutableData()
    let destination = CGImageDestinationCreateWithData(data, "public.png" as CFString, 1, nil)!
    CGImageDestinationAddImage(destination, context.makeImage()!, nil)
    precondition(CGImageDestinationFinalize(destination))
    return data as Data
  }

  @MainActor
  static func main() async throws {
    let url = URL(string: "https://vidkar.com/fixture-avatar.png")!
    for invalid in ["http://vidkar.com/a", "https://attacker.example/a", "https://vidkar.com.attacker.example/a",
      "https://name:password@vidkar.com/a", "https://vidkar.com:444/a", String(repeating: "a", count: 2049)] {
      precondition(validatedVIDKARUserAvatarURL(invalid) == nil)
    }
    precondition(validatedVIDKARUserAvatarURL(nil) == nil)
    precondition(validatedVIDKARUserAvatarURL("https://lh3.googleusercontent.com/a") != nil)
    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [AvatarProtocol.self]
    let session = URLSession(configuration: configuration)
    defer { session.invalidateAndCancel() }
    AvatarProtocol.body = png(width: 256, height: 128)
    let loaded = try await VIDKARUserAvatar.load(from: url, using: session)
    precondition(loaded.image.width == 128 && loaded.image.height == 64)
    precondition(loaded.data.count < VIDKARUserAvatar.maximumBytes)

    func expect(_ failure: VIDKARUserAvatar.Failure) async throws {
      do {
        _ = try await VIDKARUserAvatar.load(from: url, using: session)
        preconditionFailure("Debia rechazar la imagen")
      } catch let actual as VIDKARUserAvatar.Failure { precondition(actual == failure) }
    }
    AvatarProtocol.status = 403
    try await expect(.invalidResponse)
    AvatarProtocol.status = 200
    AvatarProtocol.mime = "text/html"
    try await expect(.invalidResponse)
    AvatarProtocol.mime = "image/png"
    AvatarProtocol.length = VIDKARUserAvatar.maximumBytes + 1
    try await expect(.tooLarge)
    AvatarProtocol.length = 0
    AvatarProtocol.body = Data(repeating: 0, count: VIDKARUserAvatar.maximumBytes + 1)
    try await expect(.tooLarge)
    AvatarProtocol.length = nil
    AvatarProtocol.body = Data("not-an-image".utf8)
    try await expect(.invalidImage)
    do {
      _ = try VIDKARUserAvatar.decode(png(width: 4097, height: 1))
      preconditionFailure("Debia rechazar dimensiones excesivas")
    } catch VIDKARUserAvatar.Failure.invalidImage {}

    let calls = AvatarProtocol.calls
    let cancelled = Task {
      withUnsafeCurrentTask { $0?.cancel() }
      return try await VIDKARUserAvatar.load(from: url, using: session)
    }
    do { _ = try await cancelled.value; preconditionFailure("Debia cancelar") }
    catch is CancellationError {}
    precondition(AvatarProtocol.calls == calls)
    do {
      _ = try await VIDKARUserAvatar.load(from: URL(string: "https://attacker.example/a")!, using: session)
      preconditionFailure("Debia rechazar el host antes de la red")
    } catch VIDKARUserAvatar.Failure.invalidResponse {}
    precondition(AvatarProtocol.calls == calls)

    let redirect = VIDKARUserAvatar.RedirectDelegate()
    let task = session.dataTask(with: url)
    let response = HTTPURLResponse(url: url, statusCode: 302, httpVersion: nil, headerFields: nil)!
    for target in ["https://lh3.googleusercontent.com/a", "http://vidkar.com/a", "https://attacker.example/a"] {
      let request = URLRequest(url: URL(string: target)!)
      var accepted: URLRequest?
      redirect.urlSession(session, task: task, willPerformHTTPRedirection: response,
        newRequest: request) { accepted = $0 }
      precondition((accepted != nil) == (validatedVIDKARUserAvatarURL(target) != nil))
    }
    let details = try VIDKARUserProfileDetails.decode([
      "role": "admin", "createdAt": "2024-01-02T03:04:05.000Z", "emailCount": 2, "banned": false,
      "serviceUsage": [
        "proxy": ["active": true, "usedBytes": 1048576, "limitMB": 1024, "unlimited": false, "expiresAt": "2027-01-02T00:00:00Z"],
        "vpn": ["active": true, "connected": true, "usedBytes": 2097152, "unlimited": true, "expiresAt": "2027-02-02T00:00:00.000Z"]
      ],
      "passvpn": "NO_EXPORTAR", "serviceState": ["vpnServerDomains": ["NO_EXPORTAR"]]
    ])
    precondition(details.memberSince != nil && details.serviceUsage?.vpn?.expirationDate != nil)
    precondition(details.serviceUsage?.proxy?.usedBytes == 1048576 && details.serviceUsage?.proxy?.limitMB == 1024)
    precondition(details.serviceUsage?.vpn?.consumption.contains("ilimitado") == true)
    let fractional = try VIDKARUserProfileDetails.decode(["serviceUsage": ["proxy": ["usedBytes": 1, "limitMB": 0.5]]])
    precondition(fractional.serviceUsage?.proxy?.consumption.contains(0.5.formatted(.number)) == true)
    let missingDetails = try VIDKARUserProfileDetails.decode([:])
    precondition(missingDetails.banned == nil && missingDetails.serviceUsage == nil && missingDetails.emailCount == nil)
    for invalid: [String: Any] in [
      ["emailCount": -1], ["createdAt": "no-fecha"],
      ["serviceUsage": ["vpn": ["usedBytes": -1]]],
      ["serviceUsage": ["vpn": ["usedBytes": Double(Int64.max)]]],
      ["serviceUsage": ["proxy": ["limitMB": -1]]],
      ["serviceUsage": ["vpn": ["expiresAt": "no-fecha"]]]
    ] {
      do { _ = try VIDKARUserProfileDetails.decode(invalid); preconditionFailure("No fabricar un perfil de datos inválidos") }
      catch VIDKARUserProfileDetails.Failure.invalidProfile {}
    }
    do { _ = try VIDKARUserProfileDetails.decode(["banned": "false"]); preconditionFailure("No interpretar strings como Bool") }
    catch is DecodingError {}
    for dark in [false, true] {
      for photo in [true, false] {
        let view = VIDKARUserSnippetView(fullName: "Usuario de prueba", username: "fixture-user",
          avatar: photo ? loaded.image : nil, avatarUnavailable: !photo)
        let renderer = ImageRenderer(content: view
          .environment(\.colorScheme, dark ? .dark : .light)
          .frame(width: 360))
        guard let image = renderer.cgImage else { preconditionFailure("Debia renderizar la ficha") }
        precondition(image.width == 360 && image.height > 64 && image.height <= 340)
      }
      for size in [DynamicTypeSize.large, .accessibility1] {
        let view = VIDKARUserSnippetView(fullName: "Usuario de prueba", username: "fixture-user",
          avatar: loaded.image, avatarUnavailable: false, details: details)
        let renderer = ImageRenderer(content: view
          .environment(\.colorScheme, dark ? .dark : .light)
          .environment(\.dynamicTypeSize, size)
          .frame(width: 360)
          .background(dark ? Color.black : Color.white))
        guard let image = renderer.cgImage else { preconditionFailure("Debia renderizar el perfil completo") }
        precondition(image.width == 360 && image.height > 300)
        precondition(image.height <= (size == .large ? 640 : 1050), "Ficha completa legible y acotada")
        print("Perfil completo: \(dark ? "oscuro" : "claro"), \(size): \(image.width)x\(image.height) puntos")
        if let directory = ProcessInfo.processInfo.environment["VIDKAR_SNIPPET_SNAPSHOT_DIR"] {
          let destinationURL = URL(fileURLWithPath: directory).appendingPathComponent("profile-\(dark ? "dark" : "light")-\(size).png")
          guard let destination = CGImageDestinationCreateWithURL(destinationURL as CFURL, "public.png" as CFString, 1, nil) else {
            preconditionFailure("No se pudo crear la captura de la ficha")
          }
          CGImageDestinationAddImage(destination, image, nil)
          precondition(CGImageDestinationFinalize(destination))
        }
      }
    }
    print("Avatar seguro; perfil validado, bytes/MB y ausencias sin inventar datos; render macOS básico <=340 y completo <=640 puntos, entornos Dynamic Type verificados; aceptación visual/accesible iOS pendiente: PASS")
  }
}
