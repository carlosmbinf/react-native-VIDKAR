import AppIntents
import ExpoModulesCore
import Foundation
import Security

private struct MCPToolDefinition: Codable, Sendable {
  let name: String
  let description: String?
  let inputSchema: [String: JSONValue]
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

private enum MCPError: LocalizedError {
  case notConfigured
  case invalidResponse
  case http(status: Int, body: String?)
  case server(String)

  var errorDescription: String? {
    switch self {
    case .notConfigured: return "Configura primero el endpoint y token MCP de VIDKAR."
    case .invalidResponse: return "El servidor MCP devolvió una respuesta inválida."
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
  private let cacheKey = "tools"
  private var cachedTools: [MCPToolDefinition] = []
  private var cacheLoaded = false

  func configure(url: String, token: String) throws {
    guard URL(string: url)?.scheme?.lowercased() == "https", token.count >= 20 else { throw MCPError.notConfigured }
    try KeychainStore.shared.set(url.trimmingCharacters(in: CharacterSet(charactersIn: "/")), for: urlKey)
    try KeychainStore.shared.set(token, for: tokenKey)
    UserDefaults.standard.removeObject(forKey: cacheKey)
    cachedTools = []
    cacheLoaded = false
  }

  func clearConfiguration() {
    KeychainStore.shared.clear(urlKey)
    KeychainStore.shared.clear(tokenKey)
    cachedTools = []
    cacheLoaded = false
    UserDefaults.standard.removeObject(forKey: cacheKey)
    UserDefaults.standard.removeObject(forKey: "\(cacheKey).updatedAt")
  }

  func configuration() -> (url: String?, configured: Bool) {
    let url = KeychainStore.shared.get(urlKey)
    let configured = url != nil && KeychainStore.shared.get(tokenKey) != nil
    return (url, configured)
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
    let result = try await request(method: "tools/call", params: ["name": name, "arguments": arguments])
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

  func catalog() async throws -> String {
    let tools = try await discover(force: false)
    let entries = try tools.map { tool -> [String: Any] in
      let schemaData = try JSONEncoder().encode(tool.inputSchema)
      let schema = try JSONSerialization.jsonObject(with: schemaData)
      return [
        "name": tool.name,
        "description": tool.description ?? "",
        "inputSchema": schema,
      ]
    }
    let data = try JSONSerialization.data(withJSONObject: entries, options: [.prettyPrinted, .sortedKeys])
    guard let output = String(data: data, encoding: .utf8) else { throw MCPError.invalidResponse }
    return output
  }

  private func loadCache() {
    cacheLoaded = true
    guard let data = UserDefaults.standard.data(forKey: cacheKey), let tools = try? JSONDecoder().decode([MCPToolDefinition].self, from: data) else { return }
    cachedTools = tools
  }

  private func request(method: String, params: [String: Any]) async throws -> [String: Any] {
    guard let urlString = KeychainStore.shared.get(urlKey), let token = KeychainStore.shared.get(tokenKey), let url = URL(string: urlString) else { throw MCPError.notConfigured }
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

public final class VidkarMCPModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VidkarMCP")

    AsyncFunction("configure") { (url: String, token: String) async throws in
      try await MCPTransport.shared.configure(url: url, token: token)
    }
    AsyncFunction("clearConfiguration") { () async in await MCPTransport.shared.clearConfiguration() }
    AsyncFunction("getConfiguration") { () async -> [String: Any] in
      let configuration = await MCPTransport.shared.configuration()
      return ["url": configuration.url as Any, "configured": configuration.configured]
    }
    AsyncFunction("discoverTools") { (forceRefresh: Bool) async throws -> [[String: Any]] in
      let tools = try await MCPTransport.shared.discover(force: forceRefresh)
      return tools.compactMap { tool in
        guard let schemaData = try? JSONEncoder().encode(tool.inputSchema), let schema = try? JSONSerialization.jsonObject(with: schemaData) as? [String: Any] else { return nil }
        return ["name": tool.name, "description": tool.description as Any, "inputSchema": schema]
      }
    }
    AsyncFunction("executeTool") { (name: String, arguments: [String: Any]) async throws -> String in
      try await MCPTransport.shared.execute(name: name, arguments: arguments)
    }
    AsyncFunction("getToolCatalog") { () async throws -> String in
      try await MCPTransport.shared.catalog()
    }
  }
}

@available(iOS 16.0, *)
private struct VIDKARToolNameOptionsProvider: DynamicOptionsProvider {
  func results() async throws -> [String] {
    try await MCPTransport.shared.discover(force: false).map(\.name)
  }
}

@available(iOS 16.0, *)
struct VIDKARQueryIntent: AppIntent {
  static var title: LocalizedStringResource = "Consultar VIDKAR"
  static var description = IntentDescription("Consulta una herramienta disponible en el servidor MCP de VIDKAR.")

  @Parameter(title: "Herramienta MCP", optionsProvider: VIDKARToolNameOptionsProvider())
  var toolName: String

  @Parameter(title: "Argumentos JSON", default: "{}")
  var argumentsJSON: String

  static var parameterSummary: some ParameterSummary { Summary("Consulta \(\.$toolName) con \(\.$argumentsJSON)") }

  func perform() async throws -> some IntentResult & ReturnsValue<String> {
    guard let data = argumentsJSON.data(using: .utf8), let arguments = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { throw MCPError.server("Los argumentos deben ser un objeto JSON válido.") }
    let output = try await MCPTransport.shared.execute(name: toolName, arguments: arguments)
    return .result(value: output, dialog: IntentDialog(stringLiteral: output))
  }
}

@available(iOS 16.0, *)
struct VIDKARToolCatalogIntent: AppIntent {
  static var title: LocalizedStringResource = "Ver herramientas de VIDKAR"
  static var description = IntentDescription("Devuelve las herramientas MCP disponibles, sus descripciones y sus esquemas de argumentos.")

  func perform() async throws -> some IntentResult & ReturnsValue<String> {
    let output = try await MCPTransport.shared.catalog()
    return .result(value: output, dialog: IntentDialog(stringLiteral: output))
  }
}

@available(iOS 16.0, *)
struct VIDKARAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(intent: VIDKARQueryIntent(), phrases: ["Consulta en \(.applicationName)"], shortTitle: "Consultar VIDKAR", systemImageName: "chart.bar")
    AppShortcut(intent: VIDKARToolCatalogIntent(), phrases: ["Ver herramientas en \(.applicationName)"], shortTitle: "Herramientas VIDKAR", systemImageName: "list.bullet.rectangle")
  }
}
