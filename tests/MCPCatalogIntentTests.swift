
@main
private struct MCPCatalogIntentTests {
  static func main() async throws {
    defer { transportTestDefaults.removePersistentDomain(forName: defaultsSuite) }
    let transport = MCPTransport.shared
    let network = FixtureNetwork.shared
    func assertDialog<Result: ProvidesDialog>(_ result: Result) {
      precondition(Result.Dialog.self == IntentDialog.self)
    }
    func configure() async throws {
      await network.response()
      try await transport.configure(url: "https://vidkar.com/mcp", token: "fixture-token-not-a-secret", ownerId: "fixture-owner")
    }
    func perform(_ query: String = "Tema de prueba") async throws -> [VIDKARCatalogResultEntity] {
      var intent = VIDKARQueryCatalogIntent()
      intent.query = query
      let result = try await intent.perform()
      assertDialog(result)
      return result.value ?? []
    }
    func expect(_ expected: MCPCatalogQuery.Failure, query: String = "Tema de prueba") async {
      do { _ = try await perform(query); preconditionFailure("Debía fallar") }
      catch let error as MCPCatalogQuery.Failure { precondition(error == expected) }
      catch { preconditionFailure("Error inesperado: \(error)") }
    }
    func json(_ records: [[String: Any]]) throws -> String {
      String(decoding: try JSONSerialization.data(withJSONObject: ["success": true, "results": records]), as: UTF8.self)
    }
    try await configure()
    for query in ["", "   ", "\nTema", "Tema\t", "Tema\u{0}", String(repeating: "a", count: 121), String(repeating: "😀", count: 61)] {
      await expect(.invalidQuery, query: query)
    }
    let noCalls = await network.calls
    precondition(noCalls == 0)
    let empty = try await perform(String(repeating: "a", count: 120))
    precondition(empty.isEmpty && MCPCatalogQuery.summary([]).contains("No encontré"))
    let movie: [String: Any] = ["id": "fixture-film", "type": "movie", "title": "Título de prueba", "subtitle": "Año ficticio", "description": "Descripción de prueba", "deepLink": "vidkar://movie/fixture-film", "privateIgnored": "NO_EXPORTAR"]
    await network.response(try json([movie]))
    let one = try await perform("  C++ & café  ")
    precondition(one.count == 1 && one[0].sourceId == "fixture-film" && one[0].type == "movie")
    precondition(one[0].title == "Título de prueba" && one[0].description == "Descripción de prueba")
    let args = await network.lastArguments
    precondition(Set(args.keys) == Set(["entity", "query", "limit", "offset"]))
    precondition(args["entity"] as? String == "all" && args["query"] as? String == "C++ & café" && args["limit"] as? Int == 5)
    let spoken = MCPCatalogQuery.summary(one.map { ($0.title, $0.subtitle, $0.description) })
    precondition(spoken.contains("Título de prueba") && spoken.contains("Descripción de prueba") && !spoken.contains("NO_EXPORTAR"))
    let products = ["RECARGA", "DT_SHOP", "COMERCIO"].map { source in
      ["id": "\(source):same-id", "type": "product", "title": "Producto \(source)", "subtitle": source]
    }
    await network.response(try json(products))
    let many = try await perform()
    precondition(many.count == 3 && Set(many.map(\.sourceId)).count == 3 && many.allSatisfy { $0.description.isEmpty })
    let resolved = try await VIDKARCatalogResultEntityQuery().entities(for: many.map(\.id))
    let suggested = try await VIDKARCatalogResultEntityQuery().suggestedEntities()
    precondition(resolved.isEmpty && suggested.isEmpty)
    var records = (0..<8).map { ["id": "fixture-\($0)", "type": "movie", "title": String(repeating: "x", count: 500), "description": String(repeating: "d", count: 500)] }
    records.insert(records[0], at: 1)
    await network.response(try json(records))
    let bounded = try await perform()
    precondition(bounded.count == 5 && bounded[0].title.count <= 160 && bounded[0].description.count <= 240)
    let boundedSpeech = MCPCatalogQuery.summary(bounded.map { ($0.title, $0.subtitle, $0.description) })
    precondition(boundedSpeech.count < 1200 && boundedSpeech.contains("primeras tres"))
    for type in ["user", "purchase", "sale", "order", "message", "subscription", "lesson", "unknown"] {
      await network.response(try json([["id": "fixture", "type": type, "title": "No exportar"]]))
      await expect(.invalidResponse)
    }
    for output in ["{}", "{\"success\":true}", "not-json", "{\"success\":true,\"results\":[{}]}"] {
      await network.response(output); await expect(.invalidResponse)
    }
    await network.response("{\"success\":false,\"error\":{\"code\":\"MCP_UNAUTHORIZED\",\"message\":\"NO_LEER\"}}")
    await expect(.authentication)
    await network.response(status: 401); await expect(.authentication)
    await network.response(status: 403); await expect(.forbidden)
    await network.response(status: 503); await expect(.unavailable)
    await network.response(offline: true); await expect(.network)
    await network.response(readOnly: false); await expect(.forbidden)
    let blocked = await network.calls
    precondition(blocked == 0)
    await transport.clearConfiguration(); await network.response(); await expect(.notConfigured)
    // Invocar las cuatro búsquedas reales; sus tipos y defaults no cambian.
    try await configure()
    for type in ["movie", "series", "course", "product"] {
      let source = type == "product" ? "COMERCIO:" : ""
      let link = "vidkar://\(type)/fixture" + (type == "product" ? "?source=COMERCIO" : "")
      await network.response(try json([["id": "\(source)fixture", "type": type, "title": "Título", "description": "Descripción", "deepLink": link]]))
      switch type {
      case "movie":
        var intent = VIDKARSearchMoviesIntent(); intent.query = "Título"
        let result = try await intent.perform(); assertDialog(result); precondition(result.value?.first?.summary == "Descripción")
      case "series":
        var intent = VIDKARSearchSeriesIntent(); intent.query = "Título"
        let result = try await intent.perform(); assertDialog(result); precondition(result.value?.first?.summary == "Descripción")
      case "course":
        var intent = VIDKARSearchCoursesIntent(); intent.query = "Título"
        let result = try await intent.perform(); assertDialog(result); precondition(result.value?.first?.summary == "Descripción")
      default:
        var intent = VIDKARSearchCommerceProductsIntent(); intent.query = "Título"
        let result = try await intent.perform(); assertDialog(result); precondition(result.value?.first?.summary == "Descripción")
      }
    }
    for owner in ["fixture-owner", "other-owner", "logout"] {
      for phase in ["discover", "call-initialize", "result"] {
        try await configure()
        await network.pause(at: phase)
        let task = Task { try await perform() }
        await network.waitUntilBlocked()
        if owner == "logout" { await transport.clearConfiguration() }
        else { try await transport.configure(url: "https://vidkar.com/mcp", token: "fixture-\(owner)-rotated-not-a-secret", ownerId: owner) }
        await network.resume()
        do { _ = try await task.value; preconditionFailure("No debe entregar resultados obsoletos") }
        catch MCPCatalogQuery.Failure.expired { }
      }
    }
    try await configure()
    await network.pause(at: "result")
    let cancelled = Task { try await perform() }
    await network.waitUntilBlocked(); cancelled.cancel(); await network.resume()
    do { _ = try await cancelled.value; preconditionFailure("Debe cancelar") }
    catch is CancellationError { }
    await transport.clearConfiguration()
    print("perform real: consulta + 4 búsquedas; límites, datos reales, 3 fuentes producto, privacidad, errores, 9 carreras owner/revisión/logout y cancelación: PASS")
  }
}