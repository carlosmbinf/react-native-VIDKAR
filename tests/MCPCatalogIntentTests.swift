
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
    try await configure()
    let confirmationCount = await network.confirmations
    let avatarURL = "https://lh3.googleusercontent.com/avatar.png"
    let userPayload: [String: Any] = [
      "id": "private-user-id", "type": "user", "title": "Carlos Medina",
      "subtitle": "@carlosmbinf", "description": "admin",
      "imageUrl": avatarURL,
      "email": "must-not-be-returned@example.test", "serviceUsage": ["vpn": "must-not-be-returned"],
    ]
    await network.response(try json([userPayload]))
    let profileFixture: [String: Any] = [
      "success": true, "id": "private-user-id", "username": "carlosmbinf",
      "name": "Carlos Medina", "role": "admin", "createdAt": "2024-01-02T03:04:05.000Z",
      "picture": avatarURL, "emailCount": 1,
      "serviceState": ["vpn": true, "proxyMegas": 1024, "vpnMegas": 2048,
        "proxyUnlimited": false, "vpnUnlimited": true, "vpnServerDomains": ["fixture.example"]],
      "serviceUsage": ["proxy": ["active": true, "usedBytes": 512, "limitMB": 1024],
        "vpn": ["active": true, "connected": true, "usedBytes": 256, "unlimited": true]],
      "banned": false,
    ]
    let profileData = try JSONSerialization.data(withJSONObject: profileFixture, options: [.sortedKeys])
    await network.profileResponse(String(data: profileData, encoding: .utf8))
    let userOutcome = try await queryVIDKARUserByUsername("  carlosmbinf  ") { await network.confirm() }
    guard case let .found(displayName, username, imageURL, resultId) = userOutcome else { preconditionFailure("Debe encontrar el username exacto") }
    precondition(displayName == "Carlos Medina" && username == "carlosmbinf" && imageURL == avatarURL)
    let userSession = try await transport.querySession()
    let storedProfile = try await transport.getNaturalLanguageResult(resultId: resultId, ownerId: userSession.ownerId)
    let storedEnvelope = try JSONSerialization.jsonObject(with: Data(storedProfile.utf8)) as! [String: Any]
    let storedData = storedEnvelope["data"] as! [String: Any]
    precondition(storedEnvelope["tool"] as? String == "get_user")
    precondition(storedData["role"] as? String == "admin" && storedData["emailCount"] as? Int == 1)
    precondition((storedData["serviceState"] as? [String: Any])?["vpnServerDomains"] as? [String] == ["fixture.example"])
    precondition((storedData["serviceUsage"] as? [String: Any])?["proxy"] != nil && storedData["banned"] as? Bool == false)
    precondition(storedProfile.contains("fixture.example") && !storedProfile.contains("must-not-be-returned@example.test"))
    let userEntity = VIDKARUserSearchAppEntity(fullName: displayName, username: username, avatarURL: imageURL)
    precondition(userEntity.fullName == "Carlos Medina" && userEntity.username == "carlosmbinf")
    if #available(macOS 14.0, iOS 17.0, *) {
      precondition(userEntity.displayRepresentation.image == DisplayRepresentation.Image(
        url: URL(string: avatarURL)!, displayStyle: .circular
      ))
    }
    let fallbackEntity = VIDKARUserSearchAppEntity(fullName: "Carlos Medina", username: "carlosmbinf", avatarURL: "https://attacker.example/avatar.png")
    precondition(fallbackEntity.displayRepresentation.image == DisplayRepresentation.Image(systemName: "person.crop.circle", isTemplate: true))
    let userArguments = await network.lastArguments
    precondition(Set(userArguments.keys) == Set(["entity", "username", "limit", "offset", "confirmed"]))
    precondition(userArguments["entity"] as? String == "user")
    precondition(userArguments["username"] as? String == "carlosmbinf")
    precondition(userArguments["query"] == nil && userArguments["confirmed"] as? Bool == true)
    let profileArguments = await network.lastProfileArguments
    precondition(profileArguments["userId"] as? String == "private-user-id" && profileArguments["confirmed"] as? Bool == true)
    let confirmationCountAfterUser = await network.confirmations
    precondition(confirmationCountAfterUser == confirmationCount + 2, "La búsqueda y el perfil privado exigen consentimiento nativo")

    await network.response(try json([["id": "similar", "type": "user", "title": "Carlos", "subtitle": "@carlosmbinf-extra"]]))
    let noMatch = try await queryVIDKARUserByUsername("carlosmbinf") { await network.confirm() }
    if case .notFound = noMatch { } else { preconditionFailure("No debe aceptar un username parcial") }

    await network.response(try json([userPayload, userPayload]))
    let ambiguous = try await queryVIDKARUserByUsername("carlosmbinf") { await network.confirm() }
    if case .ambiguous = ambiguous { } else { preconditionFailure("No debe escoger arbitrariamente un usuario duplicado") }

    await network.response()
    let callsBeforeInvalidUsername = await network.calls
    do {
      _ = try await queryVIDKARUserByUsername("   ") { await network.confirm() }
      preconditionFailure("Debe rechazar username vacío antes de consultar")
    } catch MCPCatalogQuery.Failure.invalidQuery { }
    let callsAfterInvalidUsername = await network.calls
    precondition(callsAfterInvalidUsername == callsBeforeInvalidUsername)

    // Un catálogo desplegado anterior no anuncia el nuevo argumento username.
    await network.usernameSchema(false)
    let legacyUser: [String: Any] = ["id": "legacy-user-id", "type": "user", "title": "Usuario de prueba", "subtitle": "@fixture-user"]
    await network.response(try json([legacyUser]))
    let legacyOutcome = try await queryVIDKARUserByUsername("fixture-user") { await network.confirm() }
    guard case .found(_, "fixture-user", _, _) = legacyOutcome else { preconditionFailure("Debe soportar el catálogo anterior") }
    let legacyArguments = await network.lastArguments
    precondition(legacyArguments["username"] == nil && legacyArguments["query"] as? String == "fixture-user")
    precondition(legacyArguments["confirmed"] as? Bool == true)
    func pageJSON(_ rows: [[String: Any]], hasMore: Bool) throws -> String {
      String(decoding: try JSONSerialization.data(withJSONObject: ["success": true, "results": rows,
        "pagination": ["hasMore": hasMore]]), as: UTF8.self)
    }
    let partialUser: [String: Any] = ["type": "user", "title": "Prueba", "subtitle": "@fixture-user-extra"]
    await network.response()
    await network.paginatedResponses([try pageJSON([partialUser], hasMore: true), try pageJSON([legacyUser], hasMore: false)])
    let beforePaging = await network.confirmations
    let pagedOutcome = try await queryVIDKARUserByUsername("FIXTURE-user") { await network.confirm() }
    guard case .found(_, "fixture-user", _, _) = pagedOutcome else { preconditionFailure("Debe revisar páginas y comparar sin distinguir mayúsculas") }
    let pagedCalls = await network.calls
    let pagedConfirmations = await network.confirmations
    let pagedArguments = await network.lastArguments
    precondition(pagedCalls == 2 && pagedConfirmations == beforePaging + 2)
    precondition(pagedArguments["offset"] as? Int == 50 && pagedArguments["confirmed"] as? Bool == true)

    await network.response(try pageJSON([partialUser], hasMore: true))
    do {
      _ = try await queryVIDKARUserByUsername("fixture-user") { await network.confirm() }
      preconditionFailure("No afirmar ausencia con resultados truncados")
    } catch MCPCatalogQuery.Failure.incompatibleSchema { }
    let boundedCalls = await network.calls
    precondition(boundedCalls == 4)

    await network.response()
    do {
      _ = try await queryVIDKARUserByUsername("fixture-user") { throw CancellationError() }
      preconditionFailure("Debe respetar cancelación")
    } catch is CancellationError { }
    let cancelledCalls = await network.calls
    precondition(cancelledCalls == 0)

    for (code, expected) in [("MCP_FORBIDDEN", MCPCatalogQuery.Failure.forbidden),
                              ("MCP_UNAUTHORIZED", .authentication),
                              ("MCP_CONFIRMATION_REQUIRED", .confirmationRequired)] {
      await network.response("{\"success\":false,\"error\":{\"code\":\"\(code)\",\"message\":\"NO_LEER\"}}")
      do {
        _ = try await queryVIDKARUserByUsername("fixture-user") { await network.confirm() }
        preconditionFailure("Debe propagar el fallo backend sin reintentos")
      } catch { precondition(catalogFailure(error) == expected) }
      let failedCalls = await network.calls
      precondition(failedCalls == 1)
    }
    precondition(catalogFailure(MCPError.confirmationRequired) == .confirmationRequired)
    precondition(catalogFailure(MCPError.server("{\"success\":false,\"error\":{\"code\":\"MCP_CONFIRMATION_REQUIRED\"}}")) == .confirmationRequired)
    for (status, expected) in [(401, MCPCatalogQuery.Failure.authentication), (403, .forbidden)] {
      await network.response(status: status)
      do {
        _ = try await queryVIDKARUserByUsername("fixture-user") { await network.confirm() }
        preconditionFailure("Debe respetar HTTP auth")
      } catch { precondition(catalogFailure(error) == expected) }
    }
    try await configure()
    await network.response()
    do {
      _ = try await queryVIDKARUserByUsername("fixture-user") { await transport.clearConfiguration() }
      preconditionFailure("No reutilizar consentimiento tras logout")
    } catch MCPQueryError.expired { }
    let loggedOutCalls = await network.calls
    precondition(loggedOutCalls == 0)
    await network.usernameSchema(true)

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