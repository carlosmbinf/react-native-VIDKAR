import Foundation
import CoreFoundation

enum MCPQueryError: LocalizedError {
  case invalidPlan
  case unavailable
  case clarification(String)
  case expired

  var errorDescription: String? {
    switch self {
    case .invalidPlan: return "No pude preparar una consulta segura. Especifica qué información quieres consultar en VIDKAR."
    case .unavailable: return "La interpretación local requiere Apple Intelligence activado y su modelo descargado. Puedes usar las consultas específicas de VIDKAR."
    case .clarification(let message): return String(message.prefix(300))
    case .expired: return "La consulta de Siri venció o la sesión cambió. Solicita una nueva consulta."
    }
  }
}

struct MCPQueryResultStore {
  private struct Entry {
    let payload: String
    let ownerId: String
    let revision: UUID
    let expiresAt: Date
  }
  private var entries: [String: Entry] = [:]

  mutating func save(_ payload: String, ownerId: String, revision: UUID, now: Date = Date()) throws -> String {
    guard payload.utf8.count <= 200_000 else { throw MCPQueryError.invalidPlan }
    entries = entries.filter { $0.value.expiresAt > now }
    if entries.count >= 3, let oldest = entries.min(by: { $0.value.expiresAt < $1.value.expiresAt })?.key {
      entries.removeValue(forKey: oldest)
    }
    let id = UUID().uuidString
    entries[id] = Entry(payload: payload, ownerId: ownerId, revision: revision, expiresAt: now.addingTimeInterval(120))
    return id
  }

  func read(_ id: String, ownerId: String, revision: UUID, now: Date = Date()) throws -> String {
    guard let entry = entries[id], entry.ownerId == ownerId, entry.revision == revision, entry.expiresAt > now else {
      throw MCPQueryError.expired
    }
    return entry.payload
  }
}

// La salida del modelo nunca es autorización ni se ejecuta sin validación.
enum MCPQueryPolicy {
  static func readOnlyTools(catalog: String) throws -> [[String: Any]] {
    guard catalog.utf8.count <= 200_000,
          let tools = try JSONSerialization.jsonObject(with: Data(catalog.utf8)) as? [[String: Any]] else {
      throw MCPQueryError.invalidPlan
    }
    return tools.filter {
      $0["readOnly"] as? Bool == true && ($0["annotations"] as? [String: Any])?["readOnlyHint"] as? Bool == true
    }
  }

  static func arguments(json: String, schema: [String: Any], ownerId: String) throws -> [String: Any] {
    guard json.utf8.count <= 8_000,
          var arguments = try JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any] else {
      throw MCPQueryError.invalidPlan
    }
    arguments.removeValue(forKey: "confirmed")
    // El modelo conoce el marcador, nunca la identidad ni el token de sesión.
    if arguments["userId"] as? String == "$currentUser" { arguments["userId"] = ownerId }
    try validate(arguments, schema: schema)
    return arguments
  }

  static func validate(_ value: Any, schema: [String: Any], depth: Int = 0) throws {
    guard depth < 12 else { throw MCPQueryError.invalidPlan }
    // Subconjunto explícito: un schema futuro desconocido falla cerrado.
    let supported: Set<String> = ["$schema", "title", "description", "default", "examples", "type", "properties", "required", "additionalProperties", "enum", "const", "anyOf", "oneOf", "items", "minItems", "maxItems", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "minLength", "maxLength", "pattern", "format"]
    guard Set(schema.keys).isSubset(of: supported) else { throw MCPQueryError.invalidPlan }
    for union in ["anyOf", "oneOf"] {
      if let variants = schema[union] as? [[String: Any]] {
        let matches = variants.filter { (try? validate(value, schema: $0, depth: depth + 1)) != nil }.count
        guard union == "oneOf" ? matches == 1 : matches > 0 else { throw MCPQueryError.invalidPlan }
      }
    }
    if let values = schema["enum"] as? [Any] {
      guard values.contains(where: { equalJSON(value, $0) }) else { throw MCPQueryError.invalidPlan }
    }
    if let constant = schema["const"], !equalJSON(value, constant) { throw MCPQueryError.invalidPlan }
    guard let type = schema["type"] as? String else {
      guard schema["anyOf"] != nil || schema["oneOf"] != nil || schema["enum"] != nil || schema["const"] != nil else { throw MCPQueryError.invalidPlan }
      return
    }
    switch type {
    case "object":
      guard let object = value as? [String: Any] else { throw MCPQueryError.invalidPlan }
      let properties = schema["properties"] as? [String: [String: Any]] ?? [:]
      for key in schema["required"] as? [String] ?? [] where object[key] == nil { throw MCPQueryError.invalidPlan }
      for (key, item) in object {
        guard let property = properties[key] else { throw MCPQueryError.invalidPlan }
        try validate(item, schema: property, depth: depth + 1)
      }
    case "array":
      guard let items = value as? [Any], let itemSchema = schema["items"] as? [String: Any] else { throw MCPQueryError.invalidPlan }
      guard items.count >= (schema["minItems"] as? Int ?? 0), items.count <= (schema["maxItems"] as? Int ?? 50) else { throw MCPQueryError.invalidPlan }
      for item in items { try validate(item, schema: itemSchema, depth: depth + 1) }
    case "string":
      guard let text = value as? String,
            text.unicodeScalars.count >= (schema["minLength"] as? Int ?? 0),
            text.unicodeScalars.count <= (schema["maxLength"] as? Int ?? 2_000) else { throw MCPQueryError.invalidPlan }
      if let pattern = schema["pattern"] as? String {
        let expression = try NSRegularExpression(pattern: pattern)
        guard expression.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) != nil else { throw MCPQueryError.invalidPlan }
      }
      if let format = schema["format"] as? String {
        guard format == "date-time" else { throw MCPQueryError.invalidPlan }
        let formatter = ISO8601DateFormatter()
        let standard = formatter.date(from: text)
        formatter.formatOptions.insert(.withFractionalSeconds)
        guard standard != nil || formatter.date(from: text) != nil else { throw MCPQueryError.invalidPlan }
      }
    case "integer", "number":
      guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(), number.doubleValue.isFinite else { throw MCPQueryError.invalidPlan }
      let n = number.doubleValue
      guard type != "integer" || n.rounded() == n,
            n >= ((schema["minimum"] as? NSNumber)?.doubleValue ?? -.infinity),
            n <= ((schema["maximum"] as? NSNumber)?.doubleValue ?? .infinity) else { throw MCPQueryError.invalidPlan }
          if let minimum = (schema["exclusiveMinimum"] as? NSNumber)?.doubleValue, n <= minimum { throw MCPQueryError.invalidPlan }
          if let maximum = (schema["exclusiveMaximum"] as? NSNumber)?.doubleValue, n >= maximum { throw MCPQueryError.invalidPlan }
    case "boolean":
      guard let number = value as? NSNumber, CFGetTypeID(number) == CFBooleanGetTypeID() else { throw MCPQueryError.invalidPlan }
    case "null":
      guard value is NSNull else { throw MCPQueryError.invalidPlan }
    default: throw MCPQueryError.invalidPlan
    }
  }

  private static func equalJSON(_ left: Any, _ right: Any) -> Bool {
    let a = try? JSONSerialization.data(withJSONObject: [left], options: [.sortedKeys])
    let b = try? JSONSerialization.data(withJSONObject: [right], options: [.sortedKeys])
    return a != nil && a == b
  }

  static func summary(output: String) throws -> String {
    guard let data = output.data(using: .utf8), let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
      return "La consulta terminó. El resultado está disponible en VIDKAR."
    }
    if payload["success"] as? Bool == false {
      throw MCPQueryError.clarification("El servidor no pudo completar esta consulta. Revisa los datos solicitados y tus permisos en VIDKAR.")
    }
    if let rows = payload["results"] as? [[String: Any]] {
      if rows.isEmpty { return "No encontré resultados en VIDKAR para esta consulta." }
      let titles = rows.prefix(3).compactMap { $0["title"] as? String }.map { String($0.prefix(100)) }
      return "Recibí \(rows.count) resultados de VIDKAR. \(titles.joined(separator: ", "))."
    }
    // No inventar un resumen financiero ni enviar los resultados privados a otro modelo.
    return "Consulta completada en VIDKAR. El resultado estructurado está disponible."
  }
}