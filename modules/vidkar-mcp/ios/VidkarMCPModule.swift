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
    case .http(let status, let body):
      if let body, !body.isEmpty { return "MCP HTTP \(status): \(body)" }
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
    KeychainStore.shared.clear(playbackAuthorizationKey)
  }

  func clearConfiguration() {
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

  func configuration() -> (url: String?, ownerId: String?, configured: Bool) {
    let url = KeychainStore.shared.get(urlKey)
    let configured = url != nil && KeychainStore.shared.get(tokenKey) != nil
    return (url, KeychainStore.shared.get(ownerKey), configured)
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
    if !force {
      if !cacheLoaded { loadCache() }
      if !cachedTools.isEmpty,
         let updatedAt = UserDefaults.standard.object(forKey: "\(cacheKey).updatedAt") as? Date,
         Date().timeIntervalSince(updatedAt) < 300 { return cachedTools }
    }
    let result = try await request(method: "tools/list", params: [:])
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

  func execute(name: String, arguments: [String: Any]) async throws -> String {
    let requiresConfirmation = try await confirmationRequired(name: name, arguments: arguments)
    if requiresConfirmation && arguments["confirmed"] as? Bool != true {
      throw MCPError.confirmationRequired
    }

    _ = try await validatedTool(name: name, arguments: arguments)
    var safeArguments = arguments
    if requiresConfirmation { safeArguments["confirmed"] = true }
    let result = try await request(method: "tools/call", params: ["name": name, "arguments": safeArguments])
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

  func confirmationRequired(name: String, arguments: [String: Any]) async throws -> Bool {
    let tool = try await validatedTool(name: name, arguments: arguments)
    let security = tool.meta?["vidkar/security"]?.object ?? [:]
    if name == "search_entities" {
      let privateEntities: Set<String> = ["user", "purchase", "sale", "order", "message", "subscription", "lesson"]
      return privateEntities.contains(arguments["entity"] as? String ?? "")
    }
    if case .bool(let required)? = security["requiresConfirmation"] { return required }
    return true
  }

  private func validatedTool(name: String, arguments: [String: Any]) async throws -> MCPToolDefinition {
    guard let tool = try await discover(force: false).first(where: { $0.name == name }),
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

  func catalog() async throws -> String {
    let tools = try await discover(force: false)
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

  private func loadCache() {
    cacheLoaded = true
    guard let data = UserDefaults.standard.data(forKey: cacheKey), let tools = try? JSONDecoder().decode([MCPToolDefinition].self, from: data) else { return }
    cachedTools = tools
  }

  private func request(method: String, params: [String: Any]) async throws -> [String: Any] {
    guard let urlString = KeychainStore.shared.get(urlKey), let token = KeychainStore.shared.get(tokenKey), let url = validatedEndpoint(urlString) else { throw MCPError.notConfigured }
    return try await request(method: method, params: params, endpoint: url, token: token)
  }

  private func request(method: String, params: [String: Any], endpoint url: URL, token: String) async throws -> [String: Any] {
    let initializeID = UUID().uuidString
    let initializeResponse = try await send(url: url, token: token, id: initializeID, method: "initialize", params: ["protocolVersion": "2025-06-18", "capabilities": [:], "clientInfo": ["name": "vidkar-ios", "version": "1.0.0"]])
    try throwJSONRPCError(in: initializeResponse)
    let response = try await send(url: url, token: token, id: UUID().uuidString, method: method, params: params)
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

public final class VidkarMCPModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VidkarMCP")

    AsyncFunction("configure") { (url: String, token: String, ownerId: String) async throws in
      try await MCPTransport.shared.configure(url: url, token: token, ownerId: ownerId)
    }
    AsyncFunction("clearConfiguration") { () async in await MCPTransport.shared.clearConfiguration() }
    AsyncFunction("getConfiguration") { () async -> [String: Any] in
      let configuration = await MCPTransport.shared.configuration()
      return ["url": configuration.url as Any, "ownerId": configuration.ownerId as Any, "configured": configuration.configured]
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
    AsyncFunction("authorizePlayback") { (entityType: String, entityId: String) async throws in
      try await MCPTransport.shared.authorizePlayback(entityType: entityType, entityId: entityId)
    }
    AsyncFunction("consumePlaybackAuthorization") { (entityType: String, entityId: String) async -> Bool in
      await MCPTransport.shared.consumePlaybackAuthorization(entityType: entityType, entityId: entityId)
    }
    AsyncFunction("syncCurrentUserIdentity") { (userId: String, fullName: String, username: String) throws in
      try VIDKARCurrentUserStore.save(id: userId, fullName: fullName, username: username)
    }
    AsyncFunction("clearCurrentUserIdentity") {
      VIDKARCurrentUserStore.clear()
    }
    AsyncFunction("getToolCatalog") { () async throws -> String in
      try await MCPTransport.shared.catalog()
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
