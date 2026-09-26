import Foundation

// Consulta literal y proyección informativa: no interpreta comandos ni elige tools.
enum MCPCatalogQuery {
  static let limit = 5
  static let allowedTypes: Set<String> = ["movie", "series", "episode", "course", "product"]

  enum Failure: LocalizedError {
    case invalidQuery, notConfigured, authentication, forbidden, network, expired, invalidResponse, unavailable

    var errorDescription: String? {
      switch self {
      case .invalidQuery: return String(localized: "Indica qué quieres consultar: de 1 a 120 caracteres, sin caracteres de control.")
      case .notConfigured: return String(localized: "Configura primero MCP en VIDKAR para consultar el catálogo con Siri.")
      case .authentication: return String(localized: "La sesión MCP no es válida. Revisa tu sesión y token en VIDKAR.")
      case .forbidden: return String(localized: "No tienes permiso para consultar este catálogo en VIDKAR.")
      case .network: return String(localized: "No se pudo conectar con VIDKAR. Comprueba la conexión e inténtalo de nuevo.")
      case .expired: return String(localized: "La sesión de VIDKAR cambió durante la consulta. Vuelve a intentarlo.")
      case .invalidResponse: return String(localized: "VIDKAR devolvió una respuesta de catálogo no válida. Inténtalo de nuevo.")
      case .unavailable: return String(localized: "No se pudo consultar el catálogo de VIDKAR. Inténtalo de nuevo más tarde.")
      }
    }
  }

  struct Record: Decodable {
    let id: String
    let type: String
    let title: String
    let subtitle: String?
    let description: String?
  }

  private struct Envelope: Decodable {
    struct ErrorPayload: Decodable { let code: String? }
    let success: Bool
    let results: [Record]?
    let error: ErrorPayload?
  }

  static func query(_ raw: String) throws -> String {
    guard raw.utf16.count <= 120,
          !raw.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }) else {
      throw Failure.invalidQuery
    }
    let value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !value.isEmpty else { throw Failure.invalidQuery }
    return value
  }

  static func failure(code: String?) -> Failure {
    switch code {
    case "MCP_UNAUTHORIZED": return .authentication
    case "MCP_FORBIDDEN", "MCP_CONFIRMATION_REQUIRED": return .forbidden
    default: return .unavailable
    }
  }

  static func decode(_ output: String) throws -> [Record] {
    guard let envelope = try? JSONDecoder().decode(Envelope.self, from: Data(output.utf8)) else {
      throw Failure.invalidResponse
    }
    guard envelope.success else { throw failure(code: envelope.error?.code) }
    guard let records = envelope.results,
          records.allSatisfy({ allowedTypes.contains($0.type) && !$0.id.isEmpty && $0.id.utf16.count <= 256 && !text($0.title, limit: 160).isEmpty }) else {
      throw Failure.invalidResponse
    }
    var seen = Set<String>()
    return Array(records.filter { seen.insert("\($0.type):\($0.id)").inserted }.prefix(limit))
  }

  static func text(_ value: String, limit: Int) -> String {
    let clean = String(String.UnicodeScalarView(value.unicodeScalars.map {
      CharacterSet.controlCharacters.contains($0) ? UnicodeScalar(32)! : $0
    })).split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    return clean.count > limit ? String(clean.prefix(limit - 1)) + "…" : clean
  }

  static func summary(_ rows: [(title: String, subtitle: String, description: String)]) -> String {
    guard !rows.isEmpty else { return String(localized: "No encontré coincidencias en el catálogo autorizado de VIDKAR.") }
    let details = rows.prefix(3).map { row in
      [text(row.title, limit: 100), text(row.subtitle, limit: 60), text(row.description, limit: rows.count == 1 ? 240 : 180)]
        .filter { !$0.isEmpty }.joined(separator: ". ")
    }.joined(separator: ". ")
    if rows.count == 1 { return String(localized: "Encontré una coincidencia en VIDKAR. \(details)") }
    let prefix = String(localized: "Coincidencias devueltas por VIDKAR: \(rows.count). \(details)")
    return rows.count > 3 ? prefix + " " + String(localized: "He leído las primeras tres; las demás están en el resultado del atajo.") : prefix
  }
}