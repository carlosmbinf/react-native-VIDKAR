
// Este archivo se concatena al transporte real por mcpQueryPolicy.test.cjs.
private final class KeychainStore {
  static let shared = KeychainStore()
  private var values: [String: String] = [:]
  func get(_ key: String) -> String? { values[key] }
  func set(_ value: String, for key: String) throws { values[key] = value }
  func clear(_ key: String) { values.removeValue(forKey: key) }
}

private let defaultsSuite = "vidkar-test-\(UUID().uuidString)"
private let transportTestDefaults = UserDefaults(suiteName: defaultsSuite)!

private actor FixtureNetwork {
  static let shared = FixtureNetwork()
  private var pauseAt: String?
  private var release: CheckedContinuation<Void, Never>?
  private var observer: CheckedContinuation<Void, Never>?
  private var initializations = 0
  private var discoveries = 0
  private(set) var calls = 0
  private(set) var confirmations = 0
  private(set) var lastArguments: [String: Any] = [:]
  private var output = "{\"success\":true,\"results\":[]}"
  private var readOnly = true
  private var responseStatus = 200
  private var offline = false
  private var supportsUsername = true
  private var pages: [String] = []
  private var profileOutput: String?
  private var lastUserSearchOutput: String?
  private(set) var lastProfileArguments: [String: Any] = [:]

  func usernameSchema(_ supported: Bool) { supportsUsername = supported }
  func paginatedResponses(_ values: [String]) { pages = values }
  func profileResponse(_ value: String?) { profileOutput = value }

  func response(_ output: String = "{\"success\":true,\"results\":[]}", readOnly: Bool = true, status: Int = 200, offline: Bool = false) {
    self.output = output; self.readOnly = readOnly; responseStatus = status; self.offline = offline
    pages = []; profileOutput = nil; lastUserSearchOutput = nil; lastProfileArguments = [:]
    calls = 0; lastArguments = [:]
  }

  func pause(at phase: String) { pauseAt = phase; calls = 0; confirmations = 0; initializations = 0; discoveries = 0 }
  func waitUntilBlocked() async {
    if release != nil { return }
    await withCheckedContinuation { observer = $0 }
  }
  func resume() { release?.resume(); release = nil }

  func checkpoint(_ phases: [String]) async {
    guard let pauseAt, phases.contains(pauseAt) else { return }
    self.pauseAt = nil
    await withCheckedContinuation { continuation in
      release = continuation
      observer?.resume(); observer = nil
    }
  }

  func confirm() async {
    confirmations += 1
    await checkpoint(["prompt"])
  }

  func data(for request: URLRequest) async throws -> (Data, URLResponse) {
    let body = try JSONSerialization.jsonObject(with: request.httpBody!) as! [String: Any]
    let method = body["method"] as! String
    let params = body["params"] as! [String: Any]
    let name = params["name"] as? String
    if method == "initialize" { initializations += 1 }
    if method == "tools/list" { discoveries += 1 }
    let isQuery = name == "search_entities" || name == "get_service_usage"
    let isUserProfile = name == "get_user"
    if isQuery { lastArguments = params["arguments"] as? [String: Any] ?? [:] }
    if isUserProfile { lastProfileArguments = params["arguments"] as? [String: Any] ?? [:] }
    if offline { throw URLError(.notConnectedToInternet) }
    let phase = method == "initialize" && initializations == 2 ? "call-initialize"
      : method == "tools/list" ? "discover" : isQuery ? "result" : "other"
    if isQuery { calls += 1 }
    await checkpoint([phase, method == "initialize" ? "initialize-\(initializations)" : "", method == "tools/list" ? "discover-\(discoveries)" : ""])
    let result: [String: Any]
    if method == "tools/list" {
      var searchProperties: [String: Any] = ["entity": [:], "confirmed": [:], "userId": [:], "limit": [:], "offset": [:], "query": [:], "category": [:], "id": [:]]
      if supportsUsername { searchProperties["username"] = [:] }
      result = ["tools": [
        ["name": "search_entities", "inputSchema": ["properties": searchProperties], "annotations": ["readOnlyHint": readOnly]],
        ["name": "get_user", "inputSchema": ["properties": ["userId": [:], "confirmed": [:]]], "annotations": ["readOnlyHint": readOnly],
          "_meta": ["vidkar/security": ["requiresConfirmation": true]]],
        ["name": "get_service_usage", "inputSchema": ["properties": ["userId": [:], "confirmed": [:]]], "annotations": ["readOnlyHint": readOnly]],
      ]]
    } else if name == "get_current_user" {
      let owner = request.value(forHTTPHeaderField: "Authorization")!.contains("other-owner") ? "other-owner" : "fixture-owner"
      result = ["content": [["type": "text", "text": "{\"success\":true,\"userId\":\"\(owner)\"}"]]]
    } else if isUserProfile {
      let profileText = profileOutput ?? defaultProfileOutput()
      result = ["content": [["type": "text", "text": profileText]]]
    } else if isQuery {
      let queryOutput = pages.isEmpty ? output : pages.removeFirst()
      if name == "search_entities" { lastUserSearchOutput = queryOutput }
      result = ["content": [["type": "text", "text": queryOutput]]]
    } else {
      precondition(method == "initialize", "No se permite otra operación")
      result = [:]
    }
    return (try JSONSerialization.data(withJSONObject: ["result": result]),
      HTTPURLResponse(url: request.url!, statusCode: responseStatus, httpVersion: nil, headerFields: nil)!)
  }

  private func defaultProfileOutput() -> String {
    guard let data = (lastUserSearchOutput ?? output).data(using: .utf8),
          let envelope = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let user = (envelope["results"] as? [[String: Any]])?.first,
          let id = user["id"] as? String else { return "{\"success\":false}" }
    let rawUsername = user["subtitle"] as? String ?? ""
    let profile: [String: Any] = [
      "success": true, "id": id,
      "username": rawUsername.hasPrefix("@") ? String(rawUsername.dropFirst()) : rawUsername,
      "name": user["title"] as? String ?? "",
      "role": user["description"] as? String ?? "Usuario",
      "emailCount": 0,
      "serviceState": ["vpn": false, "proxyMegas": 0, "vpnMegas": 0, "vpnServerDomains": [String]()],
      "serviceUsage": ["proxy": ["active": false, "usedBytes": 0], "vpn": ["active": false, "usedBytes": 0]],
      "banned": false,
    ]
    let encoded = try? JSONSerialization.data(withJSONObject: profile, options: [.sortedKeys])
    return encoded.flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
  }
}

@main
private struct MCPTransportSessionTests {
  static func main() async throws {
    defer { transportTestDefaults.removePersistentDomain(forName: defaultsSuite) }
    let transport = MCPTransport.shared
    let network = FixtureNetwork.shared
    let arguments: [String: Any] = ["entity": "user", "confirmed": true]
    for phase in ["prompt", "call-initialize", "discover", "result"] {
      try await transport.configure(url: "https://vidkar.com/mcp", token: "fixture-old-token-not-a-secret", ownerId: "fixture-owner")
      let before = try await transport.querySession()
      await network.pause(at: phase)
      let task: Task<String, Error>?
      if phase == "prompt" {
        task = nil
      } else {
        task = Task {
          try await transport.executeForSession(name: "search_entities", arguments: arguments,
            ownerId: before.ownerId, revision: before.revision.uuidString)
        }
        await network.waitUntilBlocked()
      }
      // Una configuración pendiente termina conservando owner pero rotando revision.
      try await transport.configure(url: "https://vidkar.com/mcp", token: "fixture-new-token-not-a-secret", ownerId: "fixture-owner")
      let after = try await transport.querySession()
      precondition(before.ownerId == after.ownerId && before.revision != after.revision)
      await network.resume()
      do {
        if let task { _ = try await task.value }
        else {
          _ = try await transport.executeForSession(name: "search_entities", arguments: arguments,
            ownerId: before.ownerId, revision: before.revision.uuidString)
        }
        preconditionFailure("No debe aceptar consentimiento viejo en \(phase)")
      } catch MCPQueryError.expired { }
      let calls = await network.calls
      precondition(calls == (phase == "result" ? 1 : 0))
    }
    let current = try await transport.querySession()
    let output = try await transport.executeForSession(name: "search_entities", arguments: arguments,
      ownerId: current.ownerId, revision: current.revision.uuidString)
    precondition(output.contains("\"success\":true"))
    do {
      _ = try await transport.executeForSession(name: "search_entities", arguments: arguments,
        ownerId: "other-owner", revision: current.revision.uuidString)
      preconditionFailure("Debe exigir owner")
    } catch MCPError.ownerMismatch { }

    // Los dos intents usan executeIntent: ejecutar su flujo real, incluyendo
    // discovery y la suspensión de confirmación, no una réplica JS del guard.
    for owner in ["fixture-owner", "other-owner"] {
      for name in ["search_entities", "get_service_usage"] {
        for phase in ["discover", "prompt", "discover-2", "initialize-3", "result"] {
          try await transport.configure(url: "https://vidkar.com/mcp", token: "fixture-old-token-not-a-secret", ownerId: "fixture-owner")
          let session = try await transport.querySession()
          await network.pause(at: phase)
          let task = Task {
            try await transport.executeIntent(name: name,
              arguments: name == "get_service_usage" ? ["userId": session.ownerId, "confirmed": true] : arguments,
              session: session, forceConfirmation: name == "get_service_usage") { await network.confirm() }
          }
          await network.waitUntilBlocked()
          try await transport.configure(url: "https://vidkar.com/mcp", token: "fixture-\(owner)-rotated-not-a-secret", ownerId: owner)
          await network.resume()
          do {
            _ = try await task.value
            preconditionFailure("Resultado obsoleto: \(name), \(owner), \(phase)")
          } catch MCPQueryError.expired { }
          let calls = await network.calls
          let prompts = await network.confirmations
          precondition(calls == (phase == "result" ? 1 : 0))
          precondition(prompts == (phase == "discover" ? 0 : 1))
          if phase == "discover" || phase == "discover-2" {
            precondition(transportTestDefaults.data(forKey: "tools.v2") == nil, "Discovery viejo no debe repoblar la caché")
          }
        }
      }
      // También las consultas sin consentimiento deben descartar respuestas
      // tras rotación: catálogo, opciones y las cuatro búsquedas tipadas.
      for operation in ["catalog", "options", "movie", "series", "course", "product"] {
        try await transport.configure(url: "https://vidkar.com/mcp", token: "fixture-old-token-not-a-secret", ownerId: "fixture-owner")
        await network.pause(at: operation == "catalog" || operation == "options" ? "discover" : "result")
        let task = Task {
          if operation == "catalog" { _ = try await transport.catalog(forceRefresh: true) }
          else if operation == "options" { _ = try await transport.readOnlyToolNames(forceRefresh: true) }
          else { _ = try await transport.searchCatalogEntities(entity: operation, query: "fixture") }
        }
        await network.waitUntilBlocked()
        try await transport.configure(url: "https://vidkar.com/mcp", token: "fixture-\(owner)-rotated-not-a-secret", ownerId: owner)
        await network.resume()
        do { try await task.value; preconditionFailure("Consulta obsoleta: \(operation)") }
        catch MCPQueryError.expired { }
      }
    }
    let validSession = try await transport.querySession()
    await network.pause(at: "none")
    _ = try await transport.executeIntent(name: "get_service_usage", arguments: ["userId": validSession.ownerId, "confirmed": true], session: validSession, forceConfirmation: true) { await network.confirm() }
    let prompts = await network.confirmations
    precondition(prompts == 1, "confirmed de entrada no evita consentimiento")
    do {
      _ = try await transport.executeIntent(name: "get_service_usage", arguments: ["userId": validSession.ownerId], session: validSession) { throw CancellationError() }
      preconditionFailure("Debe propagar cancelación")
    } catch is CancellationError { }
    await transport.clearConfiguration()
    print("Transporte real: 20 carreras de confirmación/ejecución + 12 de catálogo/opciones/búsquedas; same-owner/ownerchange, caché, cancelación y consentimiento verificados")
  }
}