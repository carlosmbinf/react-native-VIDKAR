import AppIntents
import ExpoModulesCore
import Foundation
import Security

private struct MCPToolDefinition: Codable, Sendable {
  let name: String
  let description: String?
  let inputSchema: [String: JSONValue]
  let annotations: [String: JSONValue]?
  let meta: [String: JSONValue]?

  enum CodingKeys: String, CodingKey {
    case name
    case description
    case inputSchema
    case annotations
    case meta = "_meta"
  }
}

private enum JSONValue: Codable, Sendable {
  case string(String)
  case number(Double)
  case bool(Bool)
  case object([String: JSONValue])
  case array([JSONValue])
  case null

  init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()
    if let value = try? container.decode(String.self) { self = .string(value); return }
    if let value = try? container.decode(Double.self) { self = .number(value); return }
    if let value = try? container.decode(Bool.self) { self = .bool(value); return }
    if let value = try? container.decode([String: JSONValue].self) { self = .object(value); return }
    if let value = try? container.decode([JSONValue].self) { self = .array(value); return }
    self = .null
  }

  func encode(to encoder: Encoder) throws {
    var container = encoder.singleValueContainer()
    switch self {
    case .string(let value): try container.encode(value)
    case .number(let value): try container.encode(value)
    case .bool(let value): try container.encode(value)
    case .object(let value): try container.encode(value)
    case .array(let value): try container.encode(value)
    case .null: try container.encodeNil()
    }
  }
}

struct VIDKARCatalogEntityPayload: Decodable, Sendable {
  let id: String
  let type: String
  let title: String
  let subtitle: String?
  let description: String?
  let deepLink: String
}

private struct VIDKARCatalogEntityEnvelope: Decodable {
  let success: Bool?
  let error: MCPErrorPayload?
  let results: [VIDKARCatalogEntityPayload]?
}

private struct MCPErrorPayload: Decodable {
  let message: String?
}

#if VIDKAR_LEGACY_INTENTS
struct MCPSearchEntityPayload: Codable, Sendable {
  let id: String
  let type: String
  let title: String
  let subtitle: String?
  let description: String?
  let imageUrl: String?
  let deepLink: String
}

private struct MCPSearchEntityEnvelope: Codable, Sendable {
  let results: [MCPSearchEntityPayload]
}
#endif

private struct PlaybackAuthorizationRecord: Codable, Sendable {
  let entityType: String
  let entityId: String
  let ownerId: String
  let expiresAt: Date
}

private extension JSONValue {
  var object: [String: JSONValue]? {
    guard case .object(let value) = self else { return nil }
    return value
  }

  var array: [JSONValue]? {
    guard case .array(let value) = self else { return nil }
    return value
  }
}

private enum MCPError: LocalizedError {
  case notConfigured
  case invalidResponse
  case toolNotAllowed
  case confirmationRequired
  case ownerMismatch
  case http(status: Int, body: String?)
  case server(String)

  var errorDescription: String? {
    switch self {
    case .notConfigured: return "Configura primero el endpoint y token MCP de VIDKAR."
    case .invalidResponse: return "El servidor MCP devolvió una respuesta inválida."
    case .toolNotAllowed: return "No tienes permisos para realizar esa acción en VIDKAR."
    case .confirmationRequired: return "Esta consulta requiere confirmación explícita en VIDKAR."
    case .ownerMismatch: return "El token MCP no pertenece a la sesión actual de VIDKAR."
    case .http(let status, _):
      return "MCP HTTP \(status). Verifica el token MCP y la conexión."
    case .server(let message): return message
    }
  }
}

private final class KeychainStore {
  static let shared = KeychainStore()
  private let service = "com.vidkar.mcp"

  func set(_ value: String, for key: String) throws {
    let data = Data(value.utf8)
    let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: key]
    SecItemDelete(query as CFDictionary)
    var item = query
    item[kSecValueData as String] = data
    guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { throw MCPError.server("No se pudo guardar la configuración MCP de forma segura.") }
  }

  func get(_ key: String) -> String? {
    let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: key, kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
    var result: AnyObject?
    guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
          let data = result as? Data else { return nil }
    return String(data: data, encoding: .utf8)
  }

  func clear(_ key: String) { SecItemDelete([kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: key] as CFDictionary) }
}

private actor MCPTransport {
  static let shared = MCPTransport()
  private let urlKey = "endpoint"
  private let tokenKey = "token"
  private let ownerKey = "ownerId"
  private let playbackAuthorizationKey = "playbackAuthorization"
  private let cacheKey = "tools.v2"
  private var cachedTools: [MCPToolDefinition] = []
  private var cacheLoaded = false
  private var queryRevision = UUID()
  private var naturalLanguageResults = MCPQueryResultStore()

  private func validatedEndpoint(_ value: String) -> URL? {
    guard let components = URLComponents(string: value),
          components.scheme?.lowercased() == "https",
          ["www.vidkar.com", "vidkar.com"].contains(components.host?.lowercased() ?? ""),
          components.port == nil || components.port == 443,
          components.path == "/mcp",
          components.query == nil,
          components.fragment == nil,
          components.user == nil,
          components.password == nil,
          let url = components.url else { return nil }
    return url
  }

  func configure(url: String, token: String, ownerId: String) async throws {
    let normalizedURL = url.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    guard let endpoint = validatedEndpoint(normalizedURL), token.count >= 20, !ownerId.isEmpty else { throw MCPError.notConfigured }
    try await verifyTokenOwner(endpoint: endpoint, token: token, expectedOwnerId: ownerId)
    let previousURL = KeychainStore.shared.get(urlKey)
    let previousToken = KeychainStore.shared.get(tokenKey)
    let previousOwnerId = KeychainStore.shared.get(ownerKey)
    do {
      try KeychainStore.shared.set(normalizedURL, for: urlKey)
      try KeychainStore.shared.set(token, for: tokenKey)
      try KeychainStore.shared.set(ownerId, for: ownerKey)
    } catch {
      if let previousURL, let previousToken, let previousOwnerId {
        try? KeychainStore.shared.set(previousURL, for: urlKey)
        try? KeychainStore.shared.set(previousToken, for: tokenKey)
        try? KeychainStore.shared.set(previousOwnerId, for: ownerKey)
      } else {
        clearConfiguration()
      }
      throw error
    }
    UserDefaults.standard.removeObject(forKey: cacheKey)
    cachedTools = []
    cacheLoaded = false
    queryRevision = UUID()
    naturalLanguageResults = MCPQueryResultStore()
    KeychainStore.shared.clear(playbackAuthorizationKey)
  }

  func clearConfiguration() {
    queryRevision = UUID()
    naturalLanguageResults = MCPQueryResultStore()
    KeychainStore.shared.clear(urlKey)
    KeychainStore.shared.clear(tokenKey)
    KeychainStore.shared.clear(ownerKey)
    KeychainStore.shared.clear(playbackAuthorizationKey)
    cachedTools = []
    cacheLoaded = false
    UserDefaults.standard.removeObject(forKey: cacheKey)
    UserDefaults.standard.removeObject(forKey: "\(cacheKey).updatedAt")
  }

  func authorizePlayback(entityType: String, entityId: String) throws {
    let allowedTypes: Set<String> = ["movie", "episode", "lesson"]
      guard allowedTypes.contains(entityType), !entityId.isEmpty,
        let ownerId = KeychainStore.shared.get(ownerKey) else { throw MCPError.toolNotAllowed }
      let record = PlaybackAuthorizationRecord(entityType: entityType, entityId: entityId, ownerId: ownerId, expiresAt: Date().addingTimeInterval(60))
    let data = try JSONEncoder().encode(record)
    guard let value = String(data: data, encoding: .utf8) else { throw MCPError.invalidResponse }
    try KeychainStore.shared.set(value, for: playbackAuthorizationKey)
  }

  func consumePlaybackAuthorization(entityType: String, entityId: String) -> Bool {
    defer { KeychainStore.shared.clear(playbackAuthorizationKey) }
      guard let ownerId = KeychainStore.shared.get(ownerKey),
        let rawValue = KeychainStore.shared.get(playbackAuthorizationKey),
          let data = rawValue.data(using: .utf8),
          let record = try? JSONDecoder().decode(PlaybackAuthorizationRecord.self, from: data) else { return false }
      return record.entityType == entityType && record.entityId == entityId && record.ownerId == ownerId && record.expiresAt > Date()
  }

  func configuration() -> (url: String?, ownerId: String?, configured: Bool, revision: String) {
    let url = KeychainStore.shared.get(urlKey)
    let configured = url != nil && KeychainStore.shared.get(tokenKey) != nil
    return (url, KeychainStore.shared.get(ownerKey), configured, queryRevision.uuidString)
  }

  private func verifyTokenOwner(endpoint: URL, token: String, expectedOwnerId: String) async throws {
    let response = try await request(
      method: "tools/call",
      params: ["name": "get_current_user", "arguments": ["confirmed": true]],
      endpoint: endpoint,
      token: token
    )
    guard let content = response["content"] as? [[String: Any]],
          let text = content.first(where: { $0["type"] as? String == "text" })?["text"] as? String,
          let data = text.data(using: .utf8),
          let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          payload["success"] as? Bool == true,
          let ownerId = payload["userId"] as? String,
          ownerId == expectedOwnerId else { throw MCPError.ownerMismatch }
  }

  func discover(force: Bool) async throws -> [MCPToolDefinition] {
    let session = try querySession()
    if !force {
      if !cacheLoaded { loadCache() }
      if !cachedTools.isEmpty,
         let updatedAt = UserDefaults.standard.object(forKey: "\(cacheKey).updatedAt") as? Date,
         Date().timeIntervalSince(updatedAt) < 300 { return cachedTools }
    }
    let result = try await request(method: "tools/list", params: [:], expectedRevision: session.revision)
    try assertQueryRevision(session.revision)
    guard let tools = result["tools"] as? [[String: Any]] else { throw MCPError.invalidResponse }
    let data = try JSONSerialization.data(withJSONObject: tools)
    cachedTools = try JSONDecoder().decode([MCPToolDefinition].self, from: data)
    cacheLoaded = true
    if let cacheData = try? JSONEncoder().encode(cachedTools) {
      UserDefaults.standard.set(cacheData, forKey: cacheKey)
      UserDefaults.standard.set(Date(), forKey: "\(cacheKey).updatedAt")
    }
    return cachedTools
  }

  func execute(name: String, arguments: [String: Any], expectedRevision: UUID? = nil) async throws -> String {
    // Incluso los consumidores antiguos quedan ligados a la sesión de entrada.
    let expectedRevision = try expectedRevision ?? querySession().revision
    try assertQueryRevision(expectedRevision)
    let tool = try await validatedTool(name: name, arguments: arguments, forceRefresh: true)
    try assertQueryRevision(expectedRevision)
    let requiresConfirmation = confirmationRequired(name: name, arguments: arguments, tool: tool)
    if requiresConfirmation && arguments["confirmed"] as? Bool != true {
      throw MCPError.confirmationRequired
    }

    var safeArguments = arguments
    if requiresConfirmation { safeArguments["confirmed"] = true }
    let result = try await request(method: "tools/call", params: ["name": name, "arguments": safeArguments], expectedRevision: expectedRevision)
    try assertQueryRevision(expectedRevision)
    if let isError = result["isError"] as? Bool, isError {
      let errorText = (result["content"] as? [[String: Any]])?
        .compactMap { $0["text"] as? String }
        .joined(separator: "\n")
      throw MCPError.server(errorText?.isEmpty == false ? errorText! : "La herramienta MCP devolvió un error.")
    }
    if let content = result["content"] as? [[String: Any]], let text = content.first(where: { $0["type"] as? String == "text" })?["text"] as? String { return text }
    let data = try JSONSerialization.data(withJSONObject: result)
    return String(data: data, encoding: .utf8) ?? "{}"
  }

  func executeForOwner(name: String, arguments: [String: Any], ownerId: String) async throws -> String {
    let session = try querySession()
    guard session.ownerId == ownerId else { throw MCPError.ownerMismatch }
    return try await execute(name: name, arguments: arguments, expectedRevision: session.revision)
  }

  func executeForSession(name: String, arguments: [String: Any], ownerId: String, revision: String) async throws -> String {
    let session = try querySession()
    guard session.ownerId == ownerId else { throw MCPError.ownerMismatch }
    guard let expected = UUID(uuidString: revision) else { throw MCPQueryError.expired }
    try assertQueryRevision(expected)
    return try await execute(name: name, arguments: arguments, expectedRevision: expected)
  }

  func confirmationRequired(name: String, arguments: [String: Any], forceRefresh: Bool = false) async throws -> Bool {
    let session = try querySession()
    let tool = try await validatedTool(name: name, arguments: arguments, forceRefresh: forceRefresh)
    try assertQueryRevision(session.revision)
    return confirmationRequired(name: name, arguments: arguments, tool: tool)
  }

  // El consentimiento pertenece al owner Y a la revisión capturados por perform().
  // La closure permite probar el mismo flujo con confirmación nativa suspendida.
  func executeIntent(name: String, arguments: [String: Any], session: (revision: UUID, ownerId: String), forceConfirmation: Bool = false, confirm: () async throws -> Void) async throws -> String {
    try assertQuerySession(session)
    var safeArguments = arguments
    safeArguments.removeValue(forKey: "confirmed")
    let required = try await confirmationRequired(name: name, arguments: safeArguments, forceRefresh: true)
    try assertQuerySession(session)
    if required || forceConfirmation {
      try await confirm()
      try assertQuerySession(session)
      safeArguments["confirmed"] = true
    }
    try Task.checkCancellation()
    let output = try await executeForSession(name: name, arguments: safeArguments,
      ownerId: session.ownerId, revision: session.revision.uuidString)
    try assertQuerySession(session)
    return output
  }

  private func confirmationRequired(name: String, arguments: [String: Any], tool: MCPToolDefinition) -> Bool {
    let security = tool.meta?["vidkar/security"]?.object ?? [:]
    if name == "search_entities" {
      let privateEntities: Set<String> = ["user", "purchase", "sale", "order", "message", "subscription", "lesson"]
      return privateEntities.contains(arguments["entity"] as? String ?? "")
    }
    if case .bool(let required)? = security["requiresConfirmation"] { return required }
    return true
  }

  private func validatedTool(name: String, arguments: [String: Any], forceRefresh: Bool = false) async throws -> MCPToolDefinition {
    guard let tool = try await discover(force: forceRefresh).first(where: { $0.name == name }),
          case .bool(true)? = tool.annotations?["readOnlyHint"] else { throw MCPError.toolNotAllowed }
    let properties = tool.inputSchema["properties"]?.object ?? [:]
    if let required = tool.inputSchema["required"]?.array {
      for value in required {
        guard case .string(let key) = value, arguments[key] != nil else { throw MCPError.invalidResponse }
      }
    }
    for key in arguments.keys where properties[key] == nil { throw MCPError.toolNotAllowed }
    return tool
  }

  func catalog(forceRefresh: Bool = false) async throws -> String {
    let session = try querySession()
    let tools = try await discover(force: forceRefresh)
    try assertQuerySession(session)
    let entries = try tools.map { tool -> [String: Any] in
      let schemaData = try JSONEncoder().encode(tool.inputSchema)
      let schema = try JSONSerialization.jsonObject(with: schemaData)
      let security = tool.meta?["vidkar/security"]?.object ?? [:]
      let annotationsData = try JSONEncoder().encode(tool.annotations ?? [:])
      let annotations = try JSONSerialization.jsonObject(with: annotationsData)
      let securityData = try JSONEncoder().encode(security)
      let securityMetadata = try JSONSerialization.jsonObject(with: securityData)
      return [
        "name": tool.name,
        "description": tool.description ?? "",
        "inputSchema": schema,
        "annotations": annotations,
        "permissions": (security["permissions"]?.array ?? []).compactMap { value in
          if case .string(let permission) = value { return permission }
          return nil
        },
        "dataClass": stringValue(security["dataClass"]) ?? "unclassified",
        "readOnly": boolValue(tool.annotations?["readOnlyHint"]) ?? false,
        "requiresConfirmation": boolValue(security["requiresConfirmation"]) ?? true,
        "security": securityMetadata,
      ]
    }
    let data = try JSONSerialization.data(withJSONObject: entries, options: [.prettyPrinted, .sortedKeys])
    guard let output = String(data: data, encoding: .utf8) else { throw MCPError.invalidResponse }
    return output
  }

  func readOnlyToolNames(forceRefresh: Bool = false) async throws -> [String] {
    let session = try querySession()
    let tools = try await discover(force: forceRefresh)
    try assertQuerySession(session)
    return tools
      .filter { boolValue($0.annotations?["readOnlyHint"]) == true }
      .map(\.name)
  }

  func searchCatalogEntities(entity: String, query: String = "", id: String? = nil, category: String? = nil, expectedRevision: UUID? = nil) async throws -> [VIDKARCatalogEntityPayload] {
    var arguments: [String: Any] = ["entity": entity, "limit": 20, "offset": 0]
    if !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { arguments["query"] = query }
    if let id, !id.isEmpty { arguments["id"] = id }
    if let category { arguments["category"] = category }
    let revision = try expectedRevision ?? querySession().revision
    let output = try await execute(name: "search_entities", arguments: arguments, expectedRevision: revision)
    try assertQueryRevision(revision)
    guard let data = output.data(using: .utf8),
          let envelope = try? JSONDecoder().decode(VIDKARCatalogEntityEnvelope.self, from: data) else { throw MCPError.invalidResponse }
    if envelope.success == false { throw MCPError.server(envelope.error?.message ?? "La búsqueda de VIDKAR no está disponible.") }
    return envelope.results ?? []
  }

#if VIDKAR_LEGACY_INTENTS
  func searchEntities(entity: String, query: String, confirmed: Bool = false) async throws -> [VIDKARSearchResultEntity] {
    let payloads = try await searchEntityPayloads(entity: entity, query: query, confirmed: confirmed)
    return payloads.compactMap(VIDKARSearchResultEntity.init(payload:))
  }

  func searchEntities(arguments: [String: Any]) async throws -> [VIDKARSearchResultEntity] {
    let output = try await execute(name: "search_entities", arguments: arguments)
    return try decodeSearchPayloads(output).compactMap(VIDKARSearchResultEntity.init(payload:))
  }

  func searchEntityPayloads(entity: String, query: String, id: String? = nil, confirmed: Bool = false) async throws -> [MCPSearchEntityPayload] {
    var arguments: [String: Any] = ["entity": entity, "limit": 20, "offset": 0]
    if !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { arguments["query"] = query }
    if let id, !id.isEmpty { arguments["id"] = id }
    if confirmed { arguments["confirmed"] = true }
    let output = try await execute(name: "search_entities", arguments: arguments)
    let payloads = try decodeSearchPayloads(output)
    if #available(iOS 27.0, *) {
      await VIDKARSpotlightIndex.index(payloads)
    }
    return payloads
  }

  func validatePlayableEntity(entityType: String, entityId: String) async throws {
    guard ["movie", "episode", "lesson"].contains(entityType), !entityId.isEmpty else { throw MCPError.toolNotAllowed }
    let confirmed = entityType == "lesson"
    let payloads = try await searchEntityPayloads(entity: entityType, query: "", id: entityId, confirmed: confirmed)
    guard payloads.contains(where: { $0.type == entityType && $0.id == entityId }) else { throw MCPError.toolNotAllowed }
  }

  private func decodeSearchPayloads(_ output: String) throws -> [MCPSearchEntityPayload] {
    guard let data = output.data(using: .utf8),
          let envelope = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { throw MCPError.invalidResponse }
    if envelope["success"] as? Bool == false,
       let error = envelope["error"] as? [String: Any],
       let message = error["message"] as? String { throw MCPError.server(message) }
    guard let data = output.data(using: .utf8),
          let response = try? JSONDecoder().decode(MCPSearchEntityEnvelope.self, from: data) else { throw MCPError.invalidResponse }
    return response.results
  }
#endif

  func querySession() throws -> (revision: UUID, ownerId: String) {
    let current = configuration()
    guard current.configured, let ownerId = current.ownerId else { throw MCPError.notConfigured }
    return (queryRevision, ownerId)
  }

  func assertQueryRevision(_ expected: UUID?) throws {
    if let expected, expected != queryRevision { throw MCPQueryError.expired }
  }

  func assertQuerySession(_ session: (revision: UUID, ownerId: String)) throws {
    try Task.checkCancellation()
    try assertQueryRevision(session.revision)
    guard try querySession().ownerId == session.ownerId else { throw MCPError.ownerMismatch }
  }

  func saveNaturalLanguageResult(query: String, tool: String, output: String, summary: String, revision: UUID) throws -> String {
    let session = try querySession()
    try assertQueryRevision(revision)
    let payload: [String: Any] = [
      "query": query,
      "tool": tool,
      "data": (try? JSONSerialization.jsonObject(with: Data(output.utf8), options: [.fragmentsAllowed])) ?? output,
      "summary": summary,
      "expiresAt": Date().addingTimeInterval(120).timeIntervalSince1970 * 1000,
    ]
    let json = String(decoding: try JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys]), as: UTF8.self)
    return try naturalLanguageResults.save(json, ownerId: session.ownerId, revision: revision)
  }

  func getNaturalLanguageResult(resultId: String, ownerId: String) throws -> String {
    let session = try querySession()
    guard session.ownerId == ownerId else { throw MCPQueryError.expired }
    return try naturalLanguageResults.read(resultId, ownerId: ownerId, revision: session.revision)
  }

  private func loadCache() {
    cacheLoaded = true
    guard let data = UserDefaults.standard.data(forKey: cacheKey), let tools = try? JSONDecoder().decode([MCPToolDefinition].self, from: data) else { return }
    cachedTools = tools
  }

  private func request(method: String, params: [String: Any], expectedRevision: UUID? = nil) async throws -> [String: Any] {
    guard let urlString = KeychainStore.shared.get(urlKey), let token = KeychainStore.shared.get(tokenKey), let url = validatedEndpoint(urlString) else { throw MCPError.notConfigured }
    return try await request(method: method, params: params, endpoint: url, token: token, expectedRevision: expectedRevision)
  }

  private func request(method: String, params: [String: Any], endpoint url: URL, token: String, expectedRevision: UUID? = nil) async throws -> [String: Any] {
    let initializeID = UUID().uuidString
    let initializeResponse = try await send(url: url, token: token, id: initializeID, method: "initialize", params: ["protocolVersion": "2025-06-18", "capabilities": [:], "clientInfo": ["name": "vidkar-ios", "version": "1.0.0"]])
    try assertQueryRevision(expectedRevision)
    try throwJSONRPCError(in: initializeResponse)
    let response = try await send(url: url, token: token, id: UUID().uuidString, method: method, params: params)
    try assertQueryRevision(expectedRevision)
    try throwJSONRPCError(in: response)
    return (response["result"] as? [String: Any]) ?? response
  }

  private func throwJSONRPCError(in response: [String: Any]) throws {
    guard let error = response["error"] as? [String: Any] else { return }
    let code = error["code"].map { String(describing: $0) } ?? "MCP_JSONRPC_ERROR"
    let message = error["message"] as? String ?? "La solicitud MCP falló."
    throw MCPError.server("MCP JSON-RPC \(code): \(message)")
  }

  private func stringValue(_ value: JSONValue?) -> String? {
    guard case .string(let string)? = value else { return nil }
    return string
  }

  private func boolValue(_ value: JSONValue?) -> Bool? {
    guard case .bool(let boolean)? = value else { return nil }
    return boolean
  }

  private func send(url: URL, token: String, id: String, method: String, params: [String: Any]) async throws -> [String: Any] {
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.timeoutInterval = 30
    request.setValue("application/json, text/event-stream", forHTTPHeaderField: "Accept")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.httpBody = try JSONSerialization.data(withJSONObject: ["jsonrpc": "2.0", "id": id, "method": method, "params": params])
    let (data, response): (Data, URLResponse)
    do {
      (data, response) = try await URLSession.shared.data(for: request)
    } catch {
      throw MCPError.server("No se pudo conectar con VIDKAR MCP: \(error.localizedDescription)")
    }
    guard let http = response as? HTTPURLResponse else { throw MCPError.invalidResponse }
    guard (200..<300).contains(http.statusCode) else {
      let body = String(data: data, encoding: .utf8)
      throw MCPError.http(status: http.statusCode, body: body)
    }
    if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] { return json }
    let lines = String(data: data, encoding: .utf8)?.split(separator: "\n") ?? []
    for line in lines where line.hasPrefix("data:") {
      if let json = try? JSONSerialization.jsonObject(with: Data(line.dropFirst(5).trimmingCharacters(in: .whitespaces).utf8)) as? [String: Any] { return json }
    }
    throw MCPError.invalidResponse
  }
}

#if VIDKAR_LEGACY_INTENTS
enum VIDKAREntityType: String, AppEnum {
  case all
  case movie
  case series
  case episode
  case course
  case lesson
  case user
  case purchase
  case sale
  case order
  case product
  case message
  case download
  case subscription

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Tipo de contenido VIDKAR")
  static var caseDisplayRepresentations: [VIDKAREntityType: DisplayRepresentation] = [
    .all: "Todo",
    .movie: "Película",
    .series: "Serie",
    .episode: "Capítulo",
    .course: "Curso",
    .lesson: "Lección",
    .user: "Usuario",
    .purchase: "Compra",
    .sale: "Venta",
    .order: "Orden",
    .product: "Producto",
    .message: "Mensaje",
    .download: "Descarga",
    .subscription: "Suscripción",
  ]
}

@available(iOS 16.0, *)
enum VIDKARPeriod: String, AppEnum {
  case unspecified
  case today
  case yesterday
  case thisWeek = "this_week"
  case lastWeek = "last_week"
  case thisMonth = "this_month"
  case lastMonth = "last_month"
  case thisYear = "this_year"
  case lastYear = "last_year"

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Período")
  static var caseDisplayRepresentations: [VIDKARPeriod: DisplayRepresentation] = [
    .unspecified: "Cualquier período",
    .today: "Hoy",
    .yesterday: "Ayer",
    .thisWeek: "Esta semana",
    .lastWeek: "La semana pasada",
    .thisMonth: "Este mes",
    .lastMonth: "El mes pasado",
    .thisYear: "Este año",
    .lastYear: "El año pasado",
  ]
}

struct VIDKARSearchResultEntity: AppEntity, Sendable {
  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Resultado de VIDKAR")
  static let defaultQuery = VIDKARSearchResultEntityQuery()

  let id: String
  @Property(title: "Título") var title: String
  @Property(title: "Subtítulo") var subtitle: String
  @Property(title: "Descripción") var summary: String
  @Property(title: "Tipo") var entityType: VIDKAREntityType
  @Property(title: "Enlace VIDKAR") var deepLink: String
  @Property(title: "Imagen opcional") var imageURL: String?

  var displayRepresentation: DisplayRepresentation {
    let symbolName: String
    switch entityType {
    case .movie: symbolName = "film"
    case .series: symbolName = "tv"
    case .episode: symbolName = "play.rectangle"
    case .course, .lesson: symbolName = "book.closed"
    case .user: symbolName = "person.crop.circle"
    case .purchase, .sale, .order: symbolName = "creditcard"
    case .product: symbolName = "shippingbox"
    case .message: symbolName = "message"
    case .download: symbolName = "arrow.down.circle"
    case .subscription: symbolName = "checkmark.seal"
    case .all: symbolName = "magnifyingglass"
    }
    return DisplayRepresentation(
      title: "\(title)",
      subtitle: "\(subtitle)",
      image: DisplayRepresentation.Image(systemName: symbolName, isTemplate: true)
    )
  }

  init(id: String, title: String, subtitle: String, summary: String, entityType: VIDKAREntityType, deepLink: String, imageURL: String? = nil) {
    self.id = id
    self.title = title
    self.subtitle = subtitle
    self.summary = summary
    self.entityType = entityType
    self.deepLink = deepLink
    self.imageURL = imageURL
  }

  init?(payload: MCPSearchEntityPayload) {
    guard let entityType = VIDKAREntityType(rawValue: payload.type),
          let url = URL(string: payload.deepLink), url.scheme?.lowercased() == "vidkar" else { return nil }
    self.init(
      id: "\(payload.type):\(payload.id)",
      title: payload.title,
      subtitle: payload.subtitle ?? "",
      summary: payload.description ?? "",
      entityType: entityType,
      deepLink: payload.deepLink,
      imageURL: payload.imageUrl
    )
  }

  init?(persistentIdentifier: String) {
    let components = persistentIdentifier.split(separator: ":", maxSplits: 1).map(String.init)
    guard components.count == 2,
          let entityType = VIDKAREntityType(rawValue: components[0]),
          let url = vidkarDeepLink(type: entityType, id: components[1]) else { return nil }
    self.init(id: persistentIdentifier, title: components[1], subtitle: components[0], summary: "", entityType: entityType, deepLink: url.absoluteString)
  }
}

struct VIDKARSearchResultEntityQuery: EntityStringQuery {
  func entities(matching string: String) async throws -> [VIDKARSearchResultEntity] {
    try await MCPTransport.shared.searchEntities(entity: "all", query: string)
  }

  func entities(for identifiers: [String]) async throws -> [VIDKARSearchResultEntity] {
    identifiers.compactMap { identifier in
      guard let entity = VIDKARSearchResultEntity(persistentIdentifier: identifier),
            ![.user, .purchase, .sale, .order, .message, .subscription, .lesson].contains(entity.entityType) else { return nil }
      return entity
    }
  }

  func suggestedEntities() async throws -> [VIDKARSearchResultEntity] { [] }
}

protocol VIDKARTypedAppEntity: AppEntity where ID == String {
  static var mcpType: String { get }
  static var requiresConfirmation: Bool { get }
  static var isSupported: Bool { get }
  var title: String { get }
  var subtitle: String { get }
  var summary: String { get }
  var deepLink: String { get }
  var imageURL: String? { get }
  init(id: String, title: String, subtitle: String, summary: String, deepLink: String)
  init?(payload: MCPSearchEntityPayload)
  init?(persistentIdentifier: String)
}

extension VIDKARTypedAppEntity {
  static var requiresConfirmation: Bool { false }
  static var isSupported: Bool { true }
  var imageURL: String? { nil }
  static var typeDisplayRepresentation: TypeDisplayRepresentation {
    TypeDisplayRepresentation(name: LocalizedStringResource(stringLiteral: mcpType))
  }
  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(title)", subtitle: "\(subtitle)")
  }

  init?(payload: MCPSearchEntityPayload) {
    guard payload.type == Self.mcpType,
          URL(string: payload.deepLink)?.scheme?.lowercased() == "vidkar" else { return nil }
    self.init(
      id: "\(Self.mcpType):\(payload.id)",
      title: payload.title,
      subtitle: payload.subtitle ?? "",
      summary: payload.description ?? "",
      deepLink: payload.deepLink
    )
  }

  init?(persistentIdentifier: String) {
    let components = persistentIdentifier.split(separator: ":", maxSplits: 1).map(String.init)
    guard components.count == 2, components[0] == Self.mcpType,
          let entityType = VIDKAREntityType(rawValue: Self.mcpType),
          let url = vidkarDeepLink(type: entityType, id: components[1]) else { return nil }
    self.init(id: persistentIdentifier, title: components[1], subtitle: Self.mcpType, summary: "", deepLink: url.absoluteString)
  }
}

protocol VIDKARTypedEntityQuery: EntityStringQuery where Entity: VIDKARTypedAppEntity {}

extension VIDKARTypedEntityQuery {
  func entities(matching string: String) async throws -> [Entity] {
    guard Entity.isSupported, !Entity.requiresConfirmation else { return [] }
    let payloads = try await MCPTransport.shared.searchEntityPayloads(entity: Entity.mcpType, query: string)
    return payloads.compactMap(Entity.init(payload:))
  }

  func entities(for identifiers: [Entity.ID]) async throws -> [Entity] {
    guard Entity.isSupported, !Entity.requiresConfirmation else { return [] }
    return identifiers.compactMap(Entity.init(persistentIdentifier:))
  }

  func suggestedEntities() async throws -> [Entity] { [] }
}

struct MovieEntityQuery: VIDKARTypedEntityQuery { typealias Entity = MovieEntity }
struct MovieEntity: VIDKARTypedAppEntity {
  static let mcpType = "movie"
  static var defaultQuery: MovieEntityQuery { MovieEntityQuery() }
  let id: String
  @Property(title: "Título") var title: String
  @Property(title: "Subtítulo") var subtitle: String
  @Property(title: "Descripción") var summary: String
  @Property(title: "Enlace VIDKAR") var deepLink: String
  init(id: String, title: String, subtitle: String, summary: String, deepLink: String) { self.id = id; self.title = title; self.subtitle = subtitle; self.summary = summary; self.deepLink = deepLink }
}

struct SeriesEntityQuery: VIDKARTypedEntityQuery { typealias Entity = SeriesEntity }
struct SeriesEntity: VIDKARTypedAppEntity {
  static let mcpType = "series"
  static var defaultQuery: SeriesEntityQuery { SeriesEntityQuery() }
  let id: String
  @Property(title: "Título") var title: String
  @Property(title: "Subtítulo") var subtitle: String
  @Property(title: "Descripción") var summary: String
  @Property(title: "Enlace VIDKAR") var deepLink: String
  init(id: String, title: String, subtitle: String, summary: String, deepLink: String) { self.id = id; self.title = title; self.subtitle = subtitle; self.summary = summary; self.deepLink = deepLink }
}

struct EpisodeEntityQuery: VIDKARTypedEntityQuery { typealias Entity = EpisodeEntity }
struct EpisodeEntity: VIDKARTypedAppEntity {
  static let mcpType = "episode"
  static var defaultQuery: EpisodeEntityQuery { EpisodeEntityQuery() }
  let id: String
  @Property(title: "Título") var title: String
  @Property(title: "Subtítulo") var subtitle: String
  @Property(title: "Descripción") var summary: String
  @Property(title: "Enlace VIDKAR") var deepLink: String
  init(id: String, title: String, subtitle: String, summary: String, deepLink: String) { self.id = id; self.title = title; self.subtitle = subtitle; self.summary = summary; self.deepLink = deepLink }
}

struct CourseEntityQuery: VIDKARTypedEntityQuery { typealias Entity = CourseEntity }
struct CourseEntity: VIDKARTypedAppEntity {
  static let mcpType = "course"
  static var defaultQuery: CourseEntityQuery { CourseEntityQuery() }
  let id: String
  @Property(title: "Título") var title: String
  @Property(title: "Subtítulo") var subtitle: String
  @Property(title: "Descripción") var summary: String
  @Property(title: "Enlace VIDKAR") var deepLink: String
  init(id: String, title: String, subtitle: String, summary: String, deepLink: String) { self.id = id; self.title = title; self.subtitle = subtitle; self.summary = summary; self.deepLink = deepLink }
}

struct LessonEntityQuery: VIDKARTypedEntityQuery { typealias Entity = LessonEntity }
struct LessonEntity: VIDKARTypedAppEntity {
  static let mcpType = "lesson"
  static let requiresConfirmation = true
  static var defaultQuery: LessonEntityQuery { LessonEntityQuery() }
  let id: String
  @Property(title: "Título") var title: String
  @Property(title: "Subtítulo") var subtitle: String
  @Property(title: "Descripción") var summary: String
  @Property(title: "Enlace VIDKAR") var deepLink: String
  init(id: String, title: String, subtitle: String, summary: String, deepLink: String) { self.id = id; self.title = title; self.subtitle = subtitle; self.summary = summary; self.deepLink = deepLink }
}

struct UserEntityQuery: VIDKARTypedEntityQuery { typealias Entity = UserEntity }
struct UserEntity: VIDKARTypedAppEntity {
  static let mcpType = "user"
  static let requiresConfirmation = true
  static var defaultQuery: UserEntityQuery { UserEntityQuery() }
  let id: String
  @Property(title: "Título") var title: String
  @Property(title: "Subtítulo") var subtitle: String
  @Property(title: "Descripción") var summary: String
  @Property(title: "Enlace VIDKAR") var deepLink: String
  init(id: String, title: String, subtitle: String, summary: String, deepLink: String) { self.id = id; self.title = title; self.subtitle = subtitle; self.summary = summary; self.deepLink = deepLink }
}

struct PurchaseEntityQuery: VIDKARTypedEntityQuery { typealias Entity = PurchaseEntity }
struct PurchaseEntity: VIDKARTypedAppEntity {
  static let mcpType = "purchase"
  static let requiresConfirmation = true
  static var defaultQuery: PurchaseEntityQuery { PurchaseEntityQuery() }
  let id: String
  @Property(title: "Título") var title: String
  @Property(title: "Subtítulo") var subtitle: String
  @Property(title: "Descripción") var summary: String
  @Property(title: "Enlace VIDKAR") var deepLink: String
  init(id: String, title: String, subtitle: String, summary: String, deepLink: String) { self.id = id; self.title = title; self.subtitle = subtitle; self.summary = summary; self.deepLink = deepLink }
}

struct SaleEntityQuery: VIDKARTypedEntityQuery { typealias Entity = SaleEntity }
struct SaleEntity: VIDKARTypedAppEntity {
  static let mcpType = "sale"
  static let requiresConfirmation = true
  static var defaultQuery: SaleEntityQuery { SaleEntityQuery() }
  let id: String
  @Property(title: "Título") var title: String
  @Property(title: "Subtítulo") var subtitle: String
  @Property(title: "Descripción") var summary: String
  @Property(title: "Enlace VIDKAR") var deepLink: String
  init(id: String, title: String, subtitle: String, summary: String, deepLink: String) { self.id = id; self.title = title; self.subtitle = subtitle; self.summary = summary; self.deepLink = deepLink }
}

struct ProductEntityQuery: VIDKARTypedEntityQuery { typealias Entity = ProductEntity }
struct ProductEntity: VIDKARTypedAppEntity {
  static let mcpType = "product"
  static var defaultQuery: ProductEntityQuery { ProductEntityQuery() }
  let id: String
  @Property(title: "Título") var title: String
  @Property(title: "Subtítulo") var subtitle: String
  @Property(title: "Descripción") var summary: String
  @Property(title: "Enlace VIDKAR") var deepLink: String
  init(id: String, title: String, subtitle: String, summary: String, deepLink: String) { self.id = id; self.title = title; self.subtitle = subtitle; self.summary = summary; self.deepLink = deepLink }
}

struct MessageEntityQuery: VIDKARTypedEntityQuery { typealias Entity = MessageEntity }
struct MessageEntity: VIDKARTypedAppEntity {
  static let mcpType = "message"
  static let requiresConfirmation = true
  static var defaultQuery: MessageEntityQuery { MessageEntityQuery() }
  let id: String
  @Property(title: "Título") var title: String
  @Property(title: "Subtítulo") var subtitle: String
  @Property(title: "Descripción") var summary: String
  @Property(title: "Enlace VIDKAR") var deepLink: String
  init(id: String, title: String, subtitle: String, summary: String, deepLink: String) { self.id = id; self.title = title; self.subtitle = subtitle; self.summary = summary; self.deepLink = deepLink }
}

struct DownloadEntityQuery: VIDKARTypedEntityQuery { typealias Entity = DownloadEntity }
struct DownloadEntity: VIDKARTypedAppEntity {
  static let mcpType = "download"
  static let isSupported = false
  static var defaultQuery: DownloadEntityQuery { DownloadEntityQuery() }
  let id: String
  @Property(title: "Título") var title: String
  @Property(title: "Subtítulo") var subtitle: String
  @Property(title: "Descripción") var summary: String
  @Property(title: "Enlace VIDKAR") var deepLink: String
  init(id: String, title: String, subtitle: String, summary: String, deepLink: String) { self.id = id; self.title = title; self.subtitle = subtitle; self.summary = summary; self.deepLink = deepLink }
}

struct SubscriptionEntityQuery: VIDKARTypedEntityQuery { typealias Entity = SubscriptionEntity }
struct SubscriptionEntity: VIDKARTypedAppEntity {
  static let mcpType = "subscription"
  static let requiresConfirmation = true
  static var defaultQuery: SubscriptionEntityQuery { SubscriptionEntityQuery() }
  let id: String
  @Property(title: "Título") var title: String
  @Property(title: "Subtítulo") var subtitle: String
  @Property(title: "Descripción") var summary: String
  @Property(title: "Enlace VIDKAR") var deepLink: String
  init(id: String, title: String, subtitle: String, summary: String, deepLink: String) { self.id = id; self.title = title; self.subtitle = subtitle; self.summary = summary; self.deepLink = deepLink }
}

private func vidkarDeepLink(type: VIDKAREntityType, id: String?, query: String? = nil, extra: [String: String] = [:]) -> URL? {
  var components = URLComponents()
  components.scheme = "vidkar"
  components.host = type == .all ? "search" : type.rawValue
  if let id, type != .all {
    let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-._~"))
    components.path = "/\(id.addingPercentEncoding(withAllowedCharacters: allowed) ?? id)"
  }
  var items = extra.map { URLQueryItem(name: $0.key, value: $0.value) }
  if let query, !query.isEmpty { items.append(URLQueryItem(name: "q", value: query)) }
  if !items.isEmpty { components.queryItems = items }
  return components.url
}
#endif

protocol VIDKARCatalogAppEntity: AppEntity where ID == String {
  static var mcpType: String { get }
  static var mcpCategory: String? { get }
  static var symbolName: String { get }
  static func backendID(from entityID: String) -> String?
  var title: String { get }
  var subtitle: String { get }
  var summary: String { get }
  var deepLink: String { get }
  init(id: String, title: String, subtitle: String, summary: String, deepLink: String)
  init?(payload: VIDKARCatalogEntityPayload)
}

extension VIDKARCatalogAppEntity {
  static var mcpCategory: String? { nil }
  public static var typeDisplayRepresentation: TypeDisplayRepresentation {
    TypeDisplayRepresentation(name: LocalizedStringResource(stringLiteral: "VIDKAR \(mcpType)"))
  }

  public var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(
      title: "\(title)",
      subtitle: "\(subtitle)",
      image: DisplayRepresentation.Image(systemName: Self.symbolName, isTemplate: true)
    )
  }

  init?(payload: VIDKARCatalogEntityPayload) {
    guard payload.type == Self.mcpType,
          Self.isValidDeepLink(payload.deepLink) else { return nil }
    self.init(
      id: "\(Self.mcpType):\(payload.id)",
      title: payload.title,
      subtitle: payload.subtitle ?? "",
      summary: payload.description ?? "",
      deepLink: payload.deepLink
    )
  }

  static func backendID(from entityID: String) -> String? {
    let entityPrefix = "\(mcpType):"
    guard entityID.hasPrefix(entityPrefix) else { return nil }
    let value = String(entityID.dropFirst(entityPrefix.count))
    guard let mcpCategory else { return value.isEmpty ? nil : value }
    let categoryPrefix = "\(mcpCategory):"
    guard value.hasPrefix(categoryPrefix) else { return nil }
    let backendID = String(value.dropFirst(categoryPrefix.count))
    return backendID.isEmpty ? nil : backendID
  }

  static func isValidDeepLink(_ value: String) -> Bool {
    guard let components = URLComponents(string: value),
          components.scheme?.lowercased() == "vidkar",
          components.host?.lowercased() == mcpType,
          components.path.split(separator: "/").count == 1 else { return false }
    if let mcpCategory {
      return components.queryItems?.first(where: { $0.name == "source" })?.value == mcpCategory
    }
    return true
  }
}

private func searchVIDKARCatalog<Entity: VIDKARCatalogAppEntity>(_ type: Entity.Type, query: String) async throws -> [Entity] {
  let session = try await MCPTransport.shared.querySession()
  let normalizedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
  guard !normalizedQuery.isEmpty else { return [] }
  let payloads = try await MCPTransport.shared.searchCatalogEntities(
    entity: Entity.mcpType,
    query: normalizedQuery,
    category: Entity.mcpCategory,
    expectedRevision: session.revision
  )
  try await MCPTransport.shared.assertQuerySession(session)
  return payloads.compactMap(Entity.init(payload:))
}

private func resolveVIDKARCatalog<Entity: VIDKARCatalogAppEntity>(_ type: Entity.Type, identifiers: [String]) async throws -> [Entity] {
  let session = try await MCPTransport.shared.querySession()
  var resolved: [Entity] = []
  for identifier in identifiers.prefix(20) {
    guard let backendID = Entity.backendID(from: identifier) else { continue }
    let payloads = try await MCPTransport.shared.searchCatalogEntities(
      entity: Entity.mcpType,
      id: backendID,
      category: Entity.mcpCategory,
      expectedRevision: session.revision
    )
    resolved.append(contentsOf: payloads.compactMap(Entity.init(payload:)))
  }
  try await MCPTransport.shared.assertQuerySession(session)
  return resolved
}

public struct VIDKARMovieEntityQuery: EntityStringQuery {
  public init() {}
  public typealias Entity = VIDKARMovieAppEntity
  public func entities(matching string: String) async throws -> [Entity] { try await searchVIDKARCatalog(Entity.self, query: string) }
  public func entities(for identifiers: [Entity.ID]) async throws -> [Entity] { try await resolveVIDKARCatalog(Entity.self, identifiers: identifiers) }
  public func suggestedEntities() async throws -> [Entity] { [] }
}

public struct VIDKARMovieAppEntity: VIDKARCatalogAppEntity {
  static let mcpType = "movie"
  static let symbolName = "film"
  public static var defaultQuery: VIDKARMovieEntityQuery { VIDKARMovieEntityQuery() }
  public let id: String
  @Property(title: "Título") var title: String
  @Property(title: "Subtítulo") var subtitle: String
  @Property(title: "Descripción") var summary: String
  @Property(title: "Enlace VIDKAR") var deepLink: String
  init(id: String, title: String, subtitle: String, summary: String, deepLink: String) {
    self.id = id; self.title = title; self.subtitle = subtitle; self.summary = summary; self.deepLink = deepLink
  }
}

public struct VIDKARSeriesEntityQuery: EntityStringQuery {
  public init() {}
  public typealias Entity = VIDKARSeriesAppEntity
  public func entities(matching string: String) async throws -> [Entity] { try await searchVIDKARCatalog(Entity.self, query: string) }
  public func entities(for identifiers: [Entity.ID]) async throws -> [Entity] { try await resolveVIDKARCatalog(Entity.self, identifiers: identifiers) }
  public func suggestedEntities() async throws -> [Entity] { [] }
}

public struct VIDKARSeriesAppEntity: VIDKARCatalogAppEntity {
  static let mcpType = "series"
  static let symbolName = "tv"
  public static var defaultQuery: VIDKARSeriesEntityQuery { VIDKARSeriesEntityQuery() }
  public let id: String
  @Property(title: "Título") var title: String
  @Property(title: "Subtítulo") var subtitle: String
  @Property(title: "Descripción") var summary: String
  @Property(title: "Enlace VIDKAR") var deepLink: String
  init(id: String, title: String, subtitle: String, summary: String, deepLink: String) {
    self.id = id; self.title = title; self.subtitle = subtitle; self.summary = summary; self.deepLink = deepLink
  }
}

public struct VIDKARCourseEntityQuery: EntityStringQuery {
  public init() {}
  public typealias Entity = VIDKARCourseAppEntity
  public func entities(matching string: String) async throws -> [Entity] { try await searchVIDKARCatalog(Entity.self, query: string) }
  public func entities(for identifiers: [Entity.ID]) async throws -> [Entity] { try await resolveVIDKARCatalog(Entity.self, identifiers: identifiers) }
  public func suggestedEntities() async throws -> [Entity] { [] }
}

public struct VIDKARCourseAppEntity: VIDKARCatalogAppEntity {
  static let mcpType = "course"
  static let symbolName = "book.closed"
  public static var defaultQuery: VIDKARCourseEntityQuery { VIDKARCourseEntityQuery() }
  public let id: String
  @Property(title: "Título") var title: String
  @Property(title: "Subtítulo") var subtitle: String
  @Property(title: "Descripción") var summary: String
  @Property(title: "Enlace VIDKAR") var deepLink: String
  init(id: String, title: String, subtitle: String, summary: String, deepLink: String) {
    self.id = id; self.title = title; self.subtitle = subtitle; self.summary = summary; self.deepLink = deepLink
  }
}

public struct VIDKARCommerceProductEntityQuery: EntityStringQuery {
  public init() {}
  public typealias Entity = VIDKARCommerceProductAppEntity
  public func entities(matching string: String) async throws -> [Entity] { try await searchVIDKARCatalog(Entity.self, query: string) }
  public func entities(for identifiers: [Entity.ID]) async throws -> [Entity] { try await resolveVIDKARCatalog(Entity.self, identifiers: identifiers) }
  public func suggestedEntities() async throws -> [Entity] { [] }
}

public struct VIDKARCommerceProductAppEntity: VIDKARCatalogAppEntity {
  static let mcpType = "product"
  static let mcpCategory = "COMERCIO"
  static let symbolName = "shippingbox"
  public static var defaultQuery: VIDKARCommerceProductEntityQuery { VIDKARCommerceProductEntityQuery() }
  public let id: String
  @Property(title: "Título") var title: String
  @Property(title: "Subtítulo") var subtitle: String
  @Property(title: "Descripción y precio") var summary: String
  @Property(title: "Enlace VIDKAR") var deepLink: String
  init(id: String, title: String, subtitle: String, summary: String, deepLink: String) {
    self.id = id; self.title = title; self.subtitle = subtitle; self.summary = summary; self.deepLink = deepLink
  }
}

@available(iOS 16.0, *)
public struct VIDKARSearchMoviesIntent: AppIntent {
  public init() {}
  public static let title: LocalizedStringResource = "Busca películas"
  public static let description = IntentDescription("Busca películas visibles en el catálogo de VIDKAR y devuelve resultados tipados.")
  public static let authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication
  public static let openAppWhenRun = false
  @Parameter(title: "Título o búsqueda", default: "") public var query: String
  public static var parameterSummary: some ParameterSummary { Summary("Busca películas: \(\.$query)") }

  public func perform() async throws -> some IntentResult & ReturnsValue<[VIDKARMovieAppEntity]> {
    do {
      let session = try await MCPTransport.shared.querySession()
      let entities = try await searchVIDKARCatalog(VIDKARMovieAppEntity.self, query: query)
      try await MCPTransport.shared.assertQuerySession(session)
      return .result(value: entities, dialog: "Películas encontradas en VIDKAR: \(entities.count).")
    } catch {
      return .result(value: [], dialog: "No se pudo buscar películas en VIDKAR.")
    }
  }
}

@available(iOS 16.0, *)
public struct VIDKARSearchSeriesIntent: AppIntent {
  public init() {}
  public static let title: LocalizedStringResource = "Busca series"
  public static let description = IntentDescription("Busca series visibles del catálogo VIDKAR con autorización actual.")
  public static let authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication
  public static let openAppWhenRun = false
  @Parameter(title: "Título o búsqueda", default: "") public var query: String
  public static var parameterSummary: some ParameterSummary { Summary("Busca series: \(\.$query)") }

  public func perform() async throws -> some IntentResult & ReturnsValue<[VIDKARSeriesAppEntity]> {
    do {
      let session = try await MCPTransport.shared.querySession()
      let entities = try await searchVIDKARCatalog(VIDKARSeriesAppEntity.self, query: query)
      try await MCPTransport.shared.assertQuerySession(session)
      return .result(value: entities, dialog: "Series encontradas en VIDKAR: \(entities.count).")
    } catch {
      return .result(value: [], dialog: "No se pudo buscar series en VIDKAR.")
    }
  }
}

@available(iOS 16.0, *)
public struct VIDKARSearchCoursesIntent: AppIntent {
  public init() {}
  public static let title: LocalizedStringResource = "Busca cursos"
  public static let description = IntentDescription("Busca cursos publicados y autorizados para el usuario en VIDKAR.")
  public static let authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication
  public static let openAppWhenRun = false
  @Parameter(title: "Nombre o búsqueda", default: "") public var query: String
  public static var parameterSummary: some ParameterSummary { Summary("Busca cursos: \(\.$query)") }

  public func perform() async throws -> some IntentResult & ReturnsValue<[VIDKARCourseAppEntity]> {
    do {
      let session = try await MCPTransport.shared.querySession()
      let entities = try await searchVIDKARCatalog(VIDKARCourseAppEntity.self, query: query)
      try await MCPTransport.shared.assertQuerySession(session)
      return .result(value: entities, dialog: "Cursos encontrados en VIDKAR: \(entities.count).")
    } catch {
      return .result(value: [], dialog: "No se pudo buscar cursos en VIDKAR.")
    }
  }
}

@available(iOS 16.0, *)
public struct VIDKARSearchCommerceProductsIntent: AppIntent {
  public init() {}
  public static let title: LocalizedStringResource = "Busca productos de Comercio"
  public static let description = IntentDescription("Busca productos únicamente en el catálogo COMERCIO de VIDKAR.")
  public static let authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication
  public static let openAppWhenRun = false
  @Parameter(title: "Producto o búsqueda", default: "") public var query: String
  public static var parameterSummary: some ParameterSummary { Summary("Busca en Comercio: \(\.$query)") }

  public func perform() async throws -> some IntentResult & ReturnsValue<[VIDKARCommerceProductAppEntity]> {
    do {
      let session = try await MCPTransport.shared.querySession()
      let entities = try await searchVIDKARCatalog(VIDKARCommerceProductAppEntity.self, query: query)
      try await MCPTransport.shared.assertQuerySession(session)
      return .result(value: entities, dialog: "Productos encontrados en Comercio VIDKAR: \(entities.count).")
    } catch {
      return .result(value: [], dialog: "No se pudo buscar productos de Comercio en VIDKAR.")
    }
  }
}

@available(iOS 16.0, *)
public enum VIDKARAccountService: String, AppEnum {
  case proxy
  case vpn

  public static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Servicio de cuenta")
  public static let caseDisplayRepresentations: [VIDKARAccountService: DisplayRepresentation] = [
    .proxy: "Proxy",
    .vpn: "VPN",
  ]
}

public struct VIDKARServiceUsageAppEntity: TransientAppEntity {
  public static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Uso de Proxy o VPN")
  public static let defaultQuery = VIDKARServiceUsageEntityQuery()
  public var id: String
  @Property(title: "Servicio") var service: VIDKARAccountService
  @Property(title: "Activo") var active: Bool
  @Property(title: "Conectado") var connected: Bool?
  @Property(title: "Bytes usados") var usedBytes: Double
  @Property(title: "Límite en MB") var limitMB: Double
  @Property(title: "Ilimitado") var unlimited: Bool
  @Property(title: "Vencimiento") var expiresAt: Date?
  @Property(title: "Estado") var summary: String

  public var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(
      title: "Uso de \(service.rawValue.uppercased()) VIDKAR",
      subtitle: "\(summary)",
      image: DisplayRepresentation.Image(systemName: "shield.lefthalf.filled", isTemplate: true)
    )
  }

  public init() {
    id = ""
    service = .proxy
    active = false
    connected = nil
    usedBytes = 0
    limitMB = 0
    unlimited = false
    expiresAt = nil
    summary = ""
  }

  init(service: VIDKARAccountService, active: Bool, connected: Bool?, usedBytes: Double, limitMB: Double, unlimited: Bool, expiresAt: Date?, summary: String) {
    id = UUID().uuidString
    self.service = service
    self.active = active
    self.connected = connected
    self.usedBytes = usedBytes
    self.limitMB = limitMB
    self.unlimited = unlimited
    self.expiresAt = expiresAt
    self.summary = summary
  }
}

@available(iOS 16.0, *)
public struct VIDKARServiceUsageEntityQuery: EntityQuery {
  public init() {}
  public func entities(for identifiers: [VIDKARServiceUsageAppEntity.ID]) async throws -> [VIDKARServiceUsageAppEntity] { [] }
  public func suggestedEntities() async throws -> [VIDKARServiceUsageAppEntity] { [] }
}

@available(iOS 16.0, *)
public struct VIDKARGetServiceUsageIntent: AppIntent {
  public init() {}
  public static let title: LocalizedStringResource = "Consulta mi Proxy o VPN"
  public static let description = IntentDescription("Consulta el uso del servicio seleccionado. Requiere confirmación y solo devuelve estado y consumo, nunca credenciales ni servidores.")
  public static let authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication
  public static let openAppWhenRun = false
  @Parameter(title: "Servicio", default: .proxy) public var service: VIDKARAccountService
  public static var parameterSummary: some ParameterSummary { Summary("Consulta mi \(\.$service) en VIDKAR") }

  public func perform() async throws -> some IntentResult & ReturnsValue<VIDKARServiceUsageAppEntity> {
    let session = try await MCPTransport.shared.querySession()
    let output = try await MCPTransport.shared.executeIntent(
      name: "get_service_usage",
      arguments: ["userId": session.ownerId], session: session, forceConfirmation: true
    ) { try await requestConfirmation(result: .result(dialog: "¿Quieres consultar el estado y consumo de tu servicio en VIDKAR?")) }
    guard let data = output.data(using: .utf8),
          let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          payload["success"] as? Bool == true,
          let services = payload["serviceUsage"] as? [String: Any],
          let usage = services[service.rawValue] as? [String: Any] else { throw MCPError.invalidResponse }

    let active = usage["active"] as? Bool ?? false
    let connected = (usage["connected"] as? Bool)
    let usedBytes = (usage["usedBytes"] as? NSNumber)?.doubleValue ?? 0
    let limitMB = (usage["limitMB"] as? NSNumber)?.doubleValue ?? 0
    let unlimited = usage["unlimited"] as? Bool ?? false
    let expiresAt = (usage["expiresAt"] as? String).flatMap { ISO8601DateFormatter().date(from: $0) }
    let state = active ? String(localized: "Activo") : String(localized: "Inactivo")
    let connection = service == .vpn
      ? (connected.map { $0 ? String(localized: "conectado") : String(localized: "sin conexión") } ?? String(localized: "conexión no disponible"))
      : ""
    let limit = unlimited ? String(localized: "sin límite") : String(localized: "límite \(String(format: "%.0f", limitMB)) MB")
    let subtitle = [state, connection, String(localized: "\(String(format: "%.0f", usedBytes)) bytes usados"), limit].filter { !$0.isEmpty }.joined(separator: " · ")
    let entity = VIDKARServiceUsageAppEntity(
      service: service,
      active: active,
      connected: connected,
      usedBytes: usedBytes,
      limitMB: limitMB,
      unlimited: unlimited,
      expiresAt: expiresAt,
      summary: subtitle
    )
    try await MCPTransport.shared.assertQuerySession(session)
    return .result(value: entity, dialog: "Consulta confirmada. \(subtitle).")
  }
}

public final class VidkarMCPModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VidkarMCP")

    AsyncFunction("configure") { (url: String, token: String, ownerId: String) async throws in
      try await MCPTransport.shared.configure(url: url, token: token, ownerId: ownerId)
    }
    AsyncFunction("clearConfiguration") { () async in await MCPTransport.shared.clearConfiguration() }
    AsyncFunction("getConfiguration") { () async -> [String: Any] in
      let configuration = await MCPTransport.shared.configuration()
      return ["url": configuration.url as Any, "ownerId": configuration.ownerId as Any, "configured": configuration.configured, "revision": configuration.revision]
    }
    AsyncFunction("discoverTools") { (forceRefresh: Bool) async throws -> [[String: Any]] in
      let tools = try await MCPTransport.shared.discover(force: forceRefresh)
      return tools.compactMap { tool in
        guard let schemaData = try? JSONEncoder().encode(tool.inputSchema), let schema = try? JSONSerialization.jsonObject(with: schemaData) as? [String: Any] else { return nil }
        let security = tool.meta?["vidkar/security"]?.object ?? [:]
        let securityData = try? JSONEncoder().encode(security)
        let securityMetadata = securityData.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] } ?? [:]
        let annotationsData = try? JSONEncoder().encode(tool.annotations ?? [:])
        let annotations = annotationsData.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] } ?? [:]
        let permissions = security["permissions"]?.array?.compactMap { value -> String? in
          guard case .string(let permission) = value else { return nil }
          return permission
        } ?? []
        let dataClass: String
        if case .string(let value)? = security["dataClass"] { dataClass = value } else { dataClass = "unclassified" }
        let readOnly: Bool
        if case .bool(let value)? = tool.annotations?["readOnlyHint"] { readOnly = value } else { readOnly = false }
        let requiresConfirmation: Bool
        if case .bool(let value)? = security["requiresConfirmation"] { requiresConfirmation = value } else { requiresConfirmation = true }
        return [
          "name": tool.name,
          "description": tool.description as Any,
          "inputSchema": schema,
          "annotations": annotations,
          "permissions": permissions,
          "dataClass": dataClass,
          "readOnly": readOnly,
          "requiresConfirmation": requiresConfirmation,
          "security": securityMetadata,
        ]
      }
    }
    AsyncFunction("executeTool") { (name: String, arguments: [String: Any]) async throws -> String in
      try await MCPTransport.shared.execute(name: name, arguments: arguments)
    }
    AsyncFunction("executeToolForOwner") { (name: String, arguments: [String: Any], ownerId: String) async throws -> String in
      try await MCPTransport.shared.executeForOwner(name: name, arguments: arguments, ownerId: ownerId)
    }
    AsyncFunction("executeToolForSession") { (name: String, arguments: [String: Any], ownerId: String, revision: String) async throws -> String in
      try await MCPTransport.shared.executeForSession(name: name, arguments: arguments, ownerId: ownerId, revision: revision)
    }
    AsyncFunction("authorizePlayback") { (entityType: String, entityId: String) async throws in
      try await MCPTransport.shared.authorizePlayback(entityType: entityType, entityId: entityId)
    }
    AsyncFunction("consumePlaybackAuthorization") { (entityType: String, entityId: String) async -> Bool in
      await MCPTransport.shared.consumePlaybackAuthorization(entityType: entityType, entityId: entityId)
    }
    AsyncFunction("getToolCatalog") { () async throws -> String in
      try await MCPTransport.shared.catalog()
    }
    AsyncFunction("getNaturalLanguageResult") { (resultId: String, ownerId: String) async throws -> String in
      try await MCPTransport.shared.getNaturalLanguageResult(resultId: resultId, ownerId: ownerId)
    }
  }
}

@available(iOS 17.0, *)
public struct VidkarMCPAppIntentsPackage: AppIntentsPackage {}

#if VIDKAR_EXPERIMENTAL_NATURAL_LANGUAGE
// No habilitar en producción: la evaluación local todavía falla en consultas básicas.
@available(iOS 26.0, *)
private extension AppIntent {
  func queryVIDKARNaturally(_ query: String) async throws -> (output: String, summary: String, resultId: String) {
    let session = try await MCPTransport.shared.querySession()
    let catalog = try await MCPTransport.shared.catalog(forceRefresh: true)
    let plan = try await MCPNaturalLanguagePlanner.plan(query: query, catalog: catalog)
    var arguments = try MCPQueryPolicy.arguments(json: plan.argumentsJSON, schema: plan.schema, ownerId: session.ownerId)
    try await MCPTransport.shared.assertQueryRevision(session.revision)
    let requiresConfirmation = try await MCPTransport.shared.confirmationRequired(name: plan.toolName, arguments: arguments, forceRefresh: true)
    try await MCPTransport.shared.assertQueryRevision(session.revision)
    if requiresConfirmation {
      try await requestConfirmation(dialog: IntentDialog(stringLiteral: "Para responder «\(String(query.prefix(200)))», VIDKAR consultará información privada mediante \(plan.toolName). ¿Quieres continuar?"))
      arguments["confirmed"] = true
    }
    try Task.checkCancellation()
    let output = try await MCPTransport.shared.execute(name: plan.toolName, arguments: arguments, expectedRevision: session.revision)
    let summary = try MCPQueryPolicy.summary(output: output)
    let resultId = try await MCPTransport.shared.saveNaturalLanguageResult(query: query, tool: plan.toolName, output: output, summary: summary, revision: session.revision)
    return (output, summary, resultId)
  }
}

// Entrada libre para Atajos. Siri decide si puede descubrirla; no es un schema genérico de MCP.
@available(iOS 26.0, *)
public struct VIDKARAskQuestionIntent: AppIntent {
  public init() {}
  public static let title: LocalizedStringResource = "Consultar información en VIDKAR"
  public static let description = IntentDescription("Interpreta una pregunta con el modelo local de Apple y consulta una herramienta de lectura del catálogo MCP actual. Pide confirmación para datos privados.")
  public static let authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication
  public static let openAppWhenRun = false
  @Parameter(title: "Qué quieres consultar") public var question: String
  public static var parameterSummary: some ParameterSummary { Summary("Consulta \(\.$question) en VIDKAR") }

  public func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
    let result = try await queryVIDKARNaturally(question)
    return .result(value: result.output, dialog: IntentDialog(stringLiteral: result.summary))
  }
}
#endif

// Ruta estable: el sistema proporciona el término; no se interpreta con FoundationModels.
// searchScopes describe capacidades estáticas, NO un filtro recibido por consulta.
@available(iOS 27.0, *)
@AppIntent(schema: .system.searchInApp)
public struct VIDKARSearchInAppIntent: ShowInAppSearchResultsIntent {
  public init() {}
  public static let searchScopes: [StringSearchScope] = [.general, .movies, .tv]
  public static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication
  public var criteria: StringSearchCriteria

  public func perform() async throws -> some IntentResult & OpensIntent {
    try Task.checkCancellation()
    // Sin red, sesión MCP ni runtime JS en perform(). La app restaura la sesión,
    // permite elegir el ámbito y consulta el router MCP con permisos vigentes.
    return .result(opensIntent: OpenURLIntent(try MCPInAppSearch.url(term: criteria.term)))
  }
}

@available(iOS 16.0, *)
private struct VIDKARMCPToolNameOptionsProvider: DynamicOptionsProvider {
  func results() async throws -> [String] {
    try await MCPTransport.shared.readOnlyToolNames(forceRefresh: true)
  }
}

@available(iOS 16.0, *)
public struct VIDKARQueryMCPIntent: AppIntent {
  public init() {}
  public static let title: LocalizedStringResource = "Consulta MCP"
  public static let description = IntentDescription("Descubre las herramientas MCP disponibles de VIDKAR y devuelve su nombre, descripción, datos de entrada y permisos en JSON.")
  public static let authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication
  public static let openAppWhenRun = false

  @Parameter(title: "Nombre de herramienta (opcional)", default: "") public var toolName: String

  public static var parameterSummary: some ParameterSummary {
    Summary("Consulta MCP: \(\.$toolName)")
  }

  public func perform() async throws -> some IntentResult & ReturnsValue<String> {
    do {
      let session = try await MCPTransport.shared.querySession()
      let rawCatalog = try await MCPTransport.shared.catalog(forceRefresh: true)
      let catalogData = Data(rawCatalog.utf8)
      let allTools = (try JSONSerialization.jsonObject(with: catalogData) as? [[String: Any]]) ?? []
      let requestedName = toolName.trimmingCharacters(in: .whitespacesAndNewlines)
      let tools = requestedName.isEmpty
        ? allTools
        : allTools.filter { ($0["name"] as? String) == requestedName }
      var payload: [String: Any] = [
        "success": requestedName.isEmpty || !tools.isEmpty,
        "count": tools.count,
        "tools": tools,
      ]
      if !requestedName.isEmpty {
        payload["requestedTool"] = requestedName
        if tools.isEmpty {
          payload["error"] = [
            "code": "MCP_TOOL_NOT_FOUND",
            "message": "La herramienta solicitada no está disponible en el catálogo MCP actual.",
          ]
        }
      }
      let output = VIDKARMCPIntentJSON.encode(payload)
      let dialog: IntentDialog = tools.isEmpty
        ? "No encontré herramientas MCP con ese nombre."
        : "Herramientas MCP encontradas: \(tools.count). El catálogo JSON está disponible."
      try await MCPTransport.shared.assertQuerySession(session)
      return .result(value: output, dialog: dialog)
    } catch {
      let output = VIDKARMCPIntentJSON.failure(error, toolName: nil)
      return .result(value: output, dialog: "No se pudo consultar el catálogo MCP de VIDKAR.")
    }
  }
}

@available(iOS 16.0, *)
public struct VIDKARExecuteMCPIntent: AppIntent {
  public init() {}
  public static let title: LocalizedStringResource = "Ejecuta MCP"
  public static let description = IntentDescription("Ejecuta una herramienta MCP de solo lectura con los parámetros JSON indicados y devuelve el resultado estructurado en JSON.")
  public static let authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication
  public static let openAppWhenRun = false

  @Parameter(title: "Herramienta MCP", optionsProvider: VIDKARMCPToolNameOptionsProvider()) public var toolName: String
  @Parameter(title: "Datos de entrada (JSON)", default: "{}") public var argumentsJSON: String

  public static var parameterSummary: some ParameterSummary {
    Summary("Ejecuta MCP: \(\.$toolName) con \(\.$argumentsJSON)")
  }

  public func perform() async throws -> some IntentResult & ReturnsValue<String> {
    let name = toolName.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !name.isEmpty else {
      let output = VIDKARMCPIntentJSON.failure(
        MCPError.server("Indica el nombre de la herramienta MCP."),
        toolName: name
      )
      return .result(value: output, dialog: "Indica qué herramienta MCP quieres ejecutar.")
    }

    guard let argumentsData = argumentsJSON.data(using: .utf8),
          let arguments = try? JSONSerialization.jsonObject(with: argumentsData) as? [String: Any] else {
      let output = VIDKARMCPIntentJSON.failure(
        MCPError.server("Los datos de entrada deben ser un objeto JSON válido."),
        toolName: name
      )
      return .result(value: output, dialog: "Los datos de entrada no son un objeto JSON válido.")
    }

    do {
      let session = try await MCPTransport.shared.querySession()
      let rawOutput = try await MCPTransport.shared.executeIntent(
        name: name, arguments: arguments, session: session
      ) { try await requestConfirmation(result: .result(dialog: "Esta consulta accede a información privada de tu cuenta. ¿Quieres continuar?")) }
      let result = VIDKARMCPIntentJSON.toolResult(rawOutput, toolName: name)
      let dialog: IntentDialog = result.success
        ? "La herramienta MCP se ejecutó correctamente. El resultado JSON está disponible."
        : "La herramienta MCP devolvió un error. El detalle está disponible en JSON."
      try await MCPTransport.shared.assertQuerySession(session)
      return .result(value: result.json, dialog: dialog)
    } catch {
      let output = VIDKARMCPIntentJSON.failure(error, toolName: name)
      return .result(value: output, dialog: "No se pudo ejecutar la herramienta MCP. El detalle está disponible en JSON.")
    }
  }
}

@available(iOS 16.0, *)
public enum VIDKARMCPSiriShortcutDefinitions {
  public static var queryMCP: AppShortcut {
    AppShortcut(
      intent: VIDKARQueryMCPIntent(),
      phrases: [
        "Consulta MCP en \\(.applicationName)",
        "Consulta herramientas MCP en \\(.applicationName)",
      ],
      shortTitle: "Consulta MCP",
      systemImageName: "list.bullet.rectangle"
    )
  }

  public static var executeMCP: AppShortcut {
    AppShortcut(
      intent: VIDKARExecuteMCPIntent(),
      phrases: [
        "Ejecuta MCP en \\(.applicationName)",
        "Ejecuta una herramienta MCP en \\(.applicationName)",
      ],
      shortTitle: "Ejecuta MCP",
      systemImageName: "play.fill"
    )
  }

  public static var searchMovies: AppShortcut {
    AppShortcut(
      intent: VIDKARSearchMoviesIntent(),
      phrases: ["Busca películas en \\(.applicationName)"],
      shortTitle: "Busca película",
      systemImageName: "film"
    )
  }

  public static var searchSeries: AppShortcut {
    AppShortcut(
      intent: VIDKARSearchSeriesIntent(),
      phrases: ["Busca series en \\(.applicationName)"],
      shortTitle: "Busca serie",
      systemImageName: "tv"
    )
  }

  public static var searchCourses: AppShortcut {
    AppShortcut(
      intent: VIDKARSearchCoursesIntent(),
      phrases: ["Busca cursos en \\(.applicationName)"],
      shortTitle: "Busca curso",
      systemImageName: "book.closed"
    )
  }

  public static var searchCommerceProducts: AppShortcut {
    AppShortcut(
      intent: VIDKARSearchCommerceProductsIntent(),
      phrases: ["Busca productos en \\(.applicationName)"],
      shortTitle: "Busca en Comercio",
      systemImageName: "shippingbox"
    )
  }

  public static var getServiceUsage: AppShortcut {
    AppShortcut(
      intent: VIDKARGetServiceUsageIntent(),
      phrases: ["Consulta mi \\(\\.$service) en \\(.applicationName)"],
      shortTitle: "Uso de Proxy o VPN",
      systemImageName: "shield.lefthalf.filled"
    )
  }
}

private enum VIDKARMCPIntentJSON {
  static func encode(_ value: [String: Any]) -> String {
    guard JSONSerialization.isValidJSONObject(value),
          let data = try? JSONSerialization.data(withJSONObject: value, options: [.prettyPrinted, .sortedKeys]),
          let json = String(data: data, encoding: .utf8) else {
      return "{\"success\":false,\"error\":{\"code\":\"MCP_JSON_ENCODING_FAILED\",\"message\":\"No se pudo serializar la respuesta MCP.\"}}"
    }
    return json
  }

  static func toolResult(_ output: String, toolName: String) -> (json: String, success: Bool) {
    let data = Data(output.utf8)
    let decoded = try? JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed])
    let toolPayload = decoded as? [String: Any]
    let success = toolPayload?["success"] as? Bool != false
    var payload: [String: Any] = [
      "success": success,
      "tool": toolName,
      "data": decoded ?? output,
    ]
    if let error = toolPayload?["error"] { payload["error"] = error }
    return (encode(payload), success)
  }

  static func failure(_ error: Error, toolName: String?) -> String {
    let isCancelled = error is CancellationError
    var payload: [String: Any] = [
      "success": false,
      "error": [
        "code": isCancelled ? "MCP_CANCELLED" : errorCode(error),
        "message": isCancelled ? "La ejecución se canceló." : error.localizedDescription,
      ],
    ]
    if let toolName, !toolName.isEmpty { payload["tool"] = toolName }
    return encode(payload)
  }

  private static func errorCode(_ error: Error) -> String {
    guard let error = error as? MCPError else { return "MCP_EXECUTION_FAILED" }
    switch error {
    case .notConfigured: return "MCP_NOT_CONFIGURED"
    case .invalidResponse: return "MCP_INVALID_RESPONSE"
    case .toolNotAllowed: return "MCP_TOOL_NOT_ALLOWED"
    case .confirmationRequired: return "MCP_CONFIRMATION_REQUIRED"
    case .ownerMismatch: return "MCP_OWNER_MISMATCH"
    case .http(let status, _): return "MCP_HTTP_\(status)"
    case .server: return "MCP_SERVER_ERROR"
    }
  }
}

#if VIDKAR_LEGACY_INTENTS
@available(iOS 16.0, *)
private struct VIDKARToolNameOptionsProvider: DynamicOptionsProvider {
  func results() async throws -> [String] {
    try await MCPTransport.shared.discover(force: false).map(\.name)
  }
}

@available(iOS 16.0, *)
enum VIDKARIntentAction: String, AppEnum {
  case search
  case open
  case play

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Acción de VIDKAR")
  static var caseDisplayRepresentations: [VIDKARIntentAction: DisplayRepresentation] = [
    .search: "Buscar o consultar",
    .open: "Abrir",
    .play: "Reproducir",
  ]
}

@available(iOS 16.0, *)
struct VIDKARGeneralQueryIntent: AppIntent {
  static var title: LocalizedStringResource = "Consultar VIDKAR"
  static var description = IntentDescription("Busca contenido o ejecuta una consulta MCP de solo lectura con los permisos de tu cuenta.")
  static var authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication
  static var openAppWhenRun = true

  @Parameter(title: "Consulta en lenguaje natural", default: "") var query: String
  @Parameter(title: "Herramienta MCP opcional", default: "") var toolName: String
  @Parameter(title: "Argumentos JSON", default: "{}") var argumentsJSON: String
  @Parameter(title: "Tipo de entidad", default: .all) var entityType: VIDKAREntityType
  @Parameter(title: "Identificador opcional", default: "") var entityID: String
  @Parameter(title: "Acción", default: .search) var action: VIDKARIntentAction
  @Parameter(title: "Solicitar confirmación adicional", default: false) var confirmationRequired: Bool

  static var parameterSummary: some ParameterSummary {
    Summary("\(\.$action) en VIDKAR: \(\.$query)")
  }

  func perform() async throws -> some IntentResult & ReturnsValue<String> {
    if action == .open || action == .play {
      if action == .play {
        guard [.movie, .episode, .lesson].contains(entityType), !entityID.isEmpty else { throw MCPError.toolNotAllowed }
      }
      guard let url = vidkarDeepLink(
        type: entityType,
        id: entityID.isEmpty ? nil : entityID,
        query: entityType == .all ? query : nil,
        extra: action == .play ? ["play": "true"] : [:]
      ) else { throw MCPError.invalidResponse }
      if action == .play {
        try await requestConfirmation()
        try await MCPTransport.shared.validatePlayableEntity(entityType: entityType.rawValue, entityId: entityID)
        try await MCPTransport.shared.authorizePlayback(entityType: entityType.rawValue, entityId: entityID)
      } else if confirmationRequired {
        try await requestConfirmation()
      }
      await openVIDKARURL(url)
      let response = action == .play ? "Iniciando la reproducción en VIDKAR." : "Abriendo el contenido en VIDKAR."
      return .result(value: response, dialog: IntentDialog(stringLiteral: response))
    }

    let name = toolName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "search_entities" : toolName
    guard let data = argumentsJSON.data(using: .utf8), var arguments = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
      throw MCPError.server("Los argumentos deben ser un objeto JSON válido.")
    }
    normalizeIntentPeriod(&arguments)
    if name == "search_entities" {
      arguments["entity"] = entityType.rawValue
      if !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { arguments["query"] = query }
    } else if arguments["query"] == nil, !query.isEmpty {
      arguments["query"] = query
    }
    let policyRequiresConfirmation = try await MCPTransport.shared.confirmationRequired(name: name, arguments: arguments)
    if policyRequiresConfirmation || confirmationRequired {
      try await requestConfirmation()
      arguments["confirmed"] = true
    }
    let output = try await MCPTransport.shared.execute(name: name, arguments: arguments)
    let summary = summarizeForSiri(output)
    return .result(value: summary, dialog: IntentDialog(stringLiteral: summary))
  }
}

@available(iOS 16.0, *)
public struct VIDKARSearchContentIntent: AppIntent {
  public init() {}
  public static var title: LocalizedStringResource = "Buscar en VIDKAR"
  public static var description = IntentDescription("Busca películas, series, capítulos, cursos, productos y otros datos disponibles para tu cuenta.")
  public static var authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication

  @Parameter(title: "Qué quieres buscar") public var query: String
  @Parameter(title: "Filtros y paginación JSON", default: "{}") public var filtersJSON: String

  public static var parameterSummary: some ParameterSummary { Summary("Buscar \(\.$query) en VIDKAR") }

  public func perform() async throws -> some IntentResult & ReturnsValue<String> {
    let arguments = try makeSearchArguments(entity: "all", query: query, filtersJSON: filtersJSON)
    let entities = try await confirmedVIDKARSearch(arguments)
    let summary = summarizeEntityResults(entities)
    let structuredResults = entities.map { entity in
      ["id": entity.id, "type": entity.entityType.rawValue, "title": entity.title, "subtitle": entity.subtitle, "description": entity.summary]
    }
    let jsonData = try JSONSerialization.data(withJSONObject: structuredResults, options: [.sortedKeys])
    return .result(value: String(decoding: jsonData, as: UTF8.self), dialog: IntentDialog(stringLiteral: summary))
  }
}

@available(iOS 16.0, *)
private func makeSearchArguments(entity: String, query: String, filtersJSON: String = "{}") throws -> [String: Any] {
  guard let data = filtersJSON.data(using: .utf8), var arguments = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
    throw MCPError.server("Los filtros deben ser un objeto JSON válido.")
  }
  normalizeIntentPeriod(&arguments)
  arguments["entity"] = entity
  let normalizedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
  if !normalizedQuery.isEmpty { arguments["query"] = normalizedQuery }
  return arguments
}

@available(iOS 16.0, *)
private extension AppIntent {
  func confirmedVIDKARSearch(_ originalArguments: [String: Any], forceConfirmation: Bool = false) async throws -> [VIDKARSearchResultEntity] {
    var arguments = originalArguments
    let policyRequiresConfirmation = try await MCPTransport.shared.confirmationRequired(name: "search_entities", arguments: arguments)
    if forceConfirmation || policyRequiresConfirmation {
      try await requestConfirmation()
      arguments["confirmed"] = true
    }
    return try await MCPTransport.shared.searchEntities(arguments: arguments)
  }

  func listPrivateVIDKARData(entity: String, query: String, period: String = "") async throws -> [VIDKARSearchResultEntity] {
    var arguments = try makeSearchArguments(entity: entity, query: query)
    if !period.isEmpty { arguments["period"] = period }
    normalizeIntentPeriod(&arguments)
    return try await confirmedVIDKARSearch(arguments, forceConfirmation: true)
  }

  func confirmedVIDKARTypedSearch<Entity: VIDKARTypedAppEntity>(
    _ originalArguments: [String: Any],
    as entityType: Entity.Type,
    forceConfirmation: Bool = false
  ) async throws -> [Entity] {
    let results = try await confirmedVIDKARSearch(originalArguments, forceConfirmation: forceConfirmation)
    return results.map { result in
      Entity(
        id: result.id,
        title: result.title,
        subtitle: result.subtitle,
        summary: result.summary,
        deepLink: result.deepLink
      )
    }
  }
}

@available(iOS 16.0, *)
struct VIDKAROpenEntityIntent: AppIntent {
  static var title: LocalizedStringResource = "Abrir contenido de VIDKAR"
  static var description = IntentDescription("Abre un resultado permitido de VIDKAR en la pantalla correspondiente.")
  static var authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication
  static var openAppWhenRun = true

  @Parameter(title: "Contenido") var entity: VIDKARSearchResultEntity

  static var parameterSummary: some ParameterSummary { Summary("Abrir \(\.$entity) en VIDKAR") }

  func perform() async throws -> some IntentResult & ReturnsValue<String> {
    guard let url = URL(string: entity.deepLink), url.scheme?.lowercased() == "vidkar" else { throw MCPError.invalidResponse }
    await openVIDKARURL(url)
    let response = "Abriendo \(entity.title) en VIDKAR."
    return .result(value: response, dialog: IntentDialog(stringLiteral: response))
  }
}

@available(iOS 16.0, *)
struct VIDKARPlayContentIntent: AppIntent {
  static var title: LocalizedStringResource = "Reproducir contenido de VIDKAR"
  static var description = IntentDescription("Abre una película, capítulo o lección autorizada. Siempre pide confirmación antes de iniciar reproducción.")
  static var authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication
  static var openAppWhenRun = true

  @Parameter(title: "Contenido") var entity: VIDKARSearchResultEntity

  static var parameterSummary: some ParameterSummary { Summary("Reproducir \(\.$entity) en VIDKAR") }

  func perform() async throws -> some IntentResult & ReturnsValue<String> {
    guard [.movie, .episode, .lesson].contains(entity.entityType),
          let baseURL = URL(string: entity.deepLink), baseURL.scheme?.lowercased() == "vidkar",
          var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else { throw MCPError.toolNotAllowed }
    try await requestConfirmation()
        let entityId = entity.id.split(separator: ":", maxSplits: 1).last.map(String.init) ?? entity.id
        try await MCPTransport.shared.validatePlayableEntity(entityType: entity.entityType.rawValue, entityId: entityId)
    try await MCPTransport.shared.authorizePlayback(entityType: entity.entityType.rawValue, entityId: entityId)
    var queryItems = components.queryItems ?? []
    queryItems.removeAll(where: { $0.name == "play" })
    queryItems.append(URLQueryItem(name: "play", value: "true"))
    components.queryItems = queryItems
    guard let url = components.url else { throw MCPError.invalidResponse }
    await openVIDKARURL(url)
    let response = "Iniciando \(entity.title) en VIDKAR."
    return .result(value: response, dialog: IntentDialog(stringLiteral: response))
  }
}

@available(iOS 16.0, *)
struct VIDKARListUserDataIntent: AppIntent {
  static var title: LocalizedStringResource = "Consultar mis datos en VIDKAR"
  static var description = IntentDescription("Consulta compras, ventas, órdenes o mensajes dentro del alcance de tu cuenta.")
  static var authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication

  init() {
    self.entityType = .purchase
    self.query = ""
    self.period = .unspecified
  }

  init(entityType: VIDKAREntityType) {
    self.entityType = entityType
    self.query = ""
    self.period = .unspecified
  }

  @Parameter(title: "Tipo de datos", default: .purchase) var entityType: VIDKAREntityType
  @Parameter(title: "Texto opcional", default: "") var query: String
  @Parameter(title: "Período opcional", default: .unspecified) var period: VIDKARPeriod

  static var parameterSummary: some ParameterSummary { Summary("Consultar mis \(\.$entityType) en VIDKAR") }

  func perform() async throws -> some IntentResult & ReturnsValue<[VIDKARSearchResultEntity]> {
    guard [.user, .purchase, .sale, .order, .message, .subscription].contains(entityType) else { throw MCPError.toolNotAllowed }
    let periodValue = period == .unspecified ? "" : period.rawValue
    let entities = try await listPrivateVIDKARData(entity: entityType.rawValue, query: query, period: periodValue)
    let summary = summarizeEntityResults(entities)
    return .result(value: entities, dialog: IntentDialog(stringLiteral: summary))
  }
}

@available(iOS 16.0, *)
struct VIDKARExecuteActionIntent: AppIntent {
  static var title: LocalizedStringResource = "Ejecutar consulta VIDKAR"
  static var description = IntentDescription("Ejecuta una herramienta MCP permitida. Solo se aceptan herramientas de lectura y se confirma cualquier consulta sensible.")
  static var authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication

  @Parameter(title: "Herramienta MCP") var toolName: String
  @Parameter(title: "Argumentos JSON", default: "{}") var argumentsJSON: String
  @Parameter(title: "Acción solicitada", default: "consultar") var requestedAction: String
  @Parameter(title: "Confirmación adicional", default: true) var confirmationRequired: Bool

  static var parameterSummary: some ParameterSummary { Summary("\(\.$requestedAction) con \(\.$toolName) en VIDKAR") }

  func perform() async throws -> some IntentResult & ReturnsValue<String> {
    guard let data = argumentsJSON.data(using: .utf8), var arguments = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
      throw MCPError.server("Los argumentos deben ser un objeto JSON válido.")
    }
    normalizeIntentPeriod(&arguments)
    let policyRequiresConfirmation = try await MCPTransport.shared.confirmationRequired(name: toolName, arguments: arguments)
    if policyRequiresConfirmation || confirmationRequired {
      try await requestConfirmation()
      arguments["confirmed"] = true
    }
    let output = try await MCPTransport.shared.execute(name: toolName, arguments: arguments)
    let summary = summarizeForSiri(output)
    return .result(value: summary, dialog: IntentDialog(stringLiteral: summary))
  }
}

@available(iOS 16.0, *)
struct VIDKARToolCatalogIntent: AppIntent {
  static var title: LocalizedStringResource = "Ver herramientas de VIDKAR"
  static var description = IntentDescription("Consulta las herramientas MCP, sus esquemas, permisos, tipo de datos y requisitos de confirmación.")
  static var authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication

  func perform() async throws -> some IntentResult & ReturnsValue<String> {
    let output = try await MCPTransport.shared.catalog()
    let count = (try? JSONSerialization.jsonObject(with: Data(output.utf8)) as? [[String: Any]])?.count ?? 0
    let response = "Encontré \(count) herramientas en el catálogo de VIDKAR."
    return .result(value: output, dialog: IntentDialog(stringLiteral: response))
  }
}

@available(iOS 16.0, *)
public struct VIDKARAppShortcuts: AppShortcutsProvider {
  public static var appShortcuts: [AppShortcut] {
    return [
    AppShortcut(intent: VIDKARSearchContentIntent(), phrases: ["Buscar en \(.applicationName)", "Consultar \(.applicationName)"], shortTitle: "Buscar VIDKAR", systemImageName: "magnifyingglass"),
    AppShortcut(intent: VIDKARListUserDataIntent(entityType: .purchase), phrases: ["Consultar mis compras en \(.applicationName)"], shortTitle: "Mis compras", systemImageName: "creditcard"),
    AppShortcut(intent: VIDKARListUserDataIntent(entityType: .sale), phrases: ["Consultar mis ventas en \(.applicationName)"], shortTitle: "Mis ventas", systemImageName: "chart.bar"),
    AppShortcut(intent: VIDKAROpenEntityIntent(), phrases: ["Abrir contenido en \(.applicationName)"], shortTitle: "Abrir contenido", systemImageName: "arrow.up.forward.app"),
    AppShortcut(intent: VIDKARPlayContentIntent(), phrases: ["Reproducir contenido en \(.applicationName)"], shortTitle: "Reproducir", systemImageName: "play.fill"),
    AppShortcut(intent: VIDKARListUserDataIntent(entityType: .subscription), phrases: ["Consultar el estado de mi suscripción en \(.applicationName)"], shortTitle: "Mi suscripción", systemImageName: "checkmark.seal")
    ]
  }
}

@MainActor
private func openVIDKARURL(_ url: URL) {
  guard url.scheme?.lowercased() == "vidkar" else { return }
  UIApplication.shared.open(url, options: [:], completionHandler: nil)
}

private func normalizeIntentPeriod(_ arguments: inout [String: Any]) {
  guard let value = arguments["period"] as? String else { return }
  let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
    .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "es"))
    .lowercased()
  let periods = [
    "hoy": "today", "today": "today",
    "ayer": "yesterday", "yesterday": "yesterday",
    "esta semana": "this_week", "this week": "this_week",
    "semana pasada": "last_week", "last week": "last_week",
    "este mes": "this_month", "this month": "this_month",
    "mes pasado": "last_month", "last month": "last_month",
    "este ano": "this_year", "this year": "this_year",
  ]
  if let period = periods[normalized] { arguments["period"] = period }
}

private func summarizeEntityResults(_ entities: [VIDKARSearchResultEntity]) -> String {
  guard !entities.isEmpty else { return "No encontré resultados para esa búsqueda en VIDKAR." }
  let titles = entities.prefix(3).map(\.title)
  let lead = "Encontré \(entities.count) resultado\(entities.count == 1 ? "" : "s") en VIDKAR."
  return "\(lead) \(titles.isEmpty ? "" : "Los primeros son \(titles.joined(separator: ", ")).")"
}

private func summarizeTypedEntityResults<Entity: VIDKARTypedAppEntity>(_ entities: [Entity]) -> String {
  guard !entities.isEmpty else { return "No encontré resultados para esa búsqueda en VIDKAR." }
  let titles = entities.prefix(3).map(\.title)
  let lead = "Encontré \(entities.count) resultado\(entities.count == 1 ? "" : "s") en VIDKAR."
  return "\(lead) \(titles.isEmpty ? "" : "Los primeros son \(titles.joined(separator: ", ")).")"
}

private func summarizeForSiri(_ output: String) -> String {
  guard let data = output.data(using: .utf8), let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
    return String(output.prefix(320))
  }
  if let error = object["error"] as? [String: Any], let message = error["message"] as? String { return message }
  if let success = object["success"] as? Bool, !success,
     let error = object["error"] as? [String: Any], let message = error["message"] as? String { return message }
  if let results = object["results"] as? [[String: Any]] {
    let total = (object["pagination"] as? [String: Any])?["total"] as? Int ?? results.count
    let titles = results.prefix(3).compactMap { $0["title"] as? String }
    if total == 0 { return "No encontré resultados para esa búsqueda en VIDKAR." }
    let lead = "Encontré \(total) resultado\(total == 1 ? "" : "s") en VIDKAR."
    return titles.isEmpty ? lead : "\(lead) Los primeros son \(titles.joined(separator: ", "))."
  }
  for key in ["users", "sales", "orders", "products", "payments"] {
    if let rows = object[key] as? [[String: Any]] {
      return rows.isEmpty ? "No encontré resultados para esa búsqueda en VIDKAR." : "Encontré \(rows.count) resultados en VIDKAR."
    }
  }
  return "La consulta se completó en VIDKAR."
}
#endif
