import Foundation

// Contrato de navegación, no parser de lenguaje natural ni catálogo de herramientas.
enum MCPInAppSearch {
  enum InvalidCriteria: LocalizedError {
    case invalidTerm
    var errorDescription: String? {
      "Indica una búsqueda de hasta 120 caracteres, sin caracteres de control."
    }

  }

  static func url(term: String) throws -> URL {
    let query = term.trimmingCharacters(in: .whitespacesAndNewlines)
    guard query.utf16.count <= 120,
          !query.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }) else {
      throw InvalidCriteria.invalidTerm
    }
    let configuredBase = Bundle.main.object(forInfoDictionaryKey: "VIDKAR_BASE_URL") as? String
      ?? "https://www.vidkar.com"
    let baseComponents = URLComponents(string: configuredBase)
    let configuredHost = baseComponents?.scheme?.lowercased() == "https"
      ? baseComponents?.host
      : nil

    var components = URLComponents()
    components.scheme = "https"
    components.host = configuredHost ?? "www.vidkar.com"
    components.port = configuredHost == nil ? nil : baseComponents?.port
    components.path = "/search"
    components.queryItems = [URLQueryItem(name: "q", value: query), URLQueryItem(name: "entity", value: "all")]
    // URLSearchParams de JS interpreta '+' como espacio: preservarlo literalmente.
    components.percentEncodedQuery = components.percentEncodedQuery?.replacingOccurrences(of: "+", with: "%2B")
    guard let url = components.url else { throw InvalidCriteria.invalidTerm }
    return url
  }
}

final class MCPInAppSearchDelivery {
  static let shared = MCPInAppSearchDelivery()

  private let lock = NSLock()
  private var pending: [String: String]?
  private var listener: (() -> Void)?

  func enqueue(_ url: URL) {
    lock.lock()
    pending = ["id": UUID().uuidString, "url": url.absoluteString]
    let notify = listener
    lock.unlock()
    notify?()
  }

  func getPending() -> [String: String]? {
    lock.lock()
    defer { lock.unlock() }
    return pending
  }

  func acknowledge(_ id: String) {
    lock.lock()
    defer { lock.unlock() }
    if pending?["id"] == id { pending = nil }
  }

  func setListener(_ listener: (() -> Void)?) {
    lock.lock()
    self.listener = listener
    lock.unlock()
  }
}