private enum FixtureUserAvatar {
  static var failure: Error?
  static var logout = false
  static var rotatedOwner: String?

  static func load(from url: URL) async throws -> VIDKARUserAvatar.LoadedImage {
    if let failure { throw failure }
    if logout { await MCPTransport.shared.clearConfiguration() }
    if let owner = rotatedOwner {
      try await MCPTransport.shared.configure(url: "https://vidkar.com/mcp",
        token: "fixture-rotated-token-not-a-secret-\(owner)", ownerId: owner)
    }
    let data = Data(base64Encoded: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")!
    return try VIDKARUserAvatar.decode(data)
  }
}

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
    let userOutcome = try await queryVIDKARUserByUsername("  carlosmbinf  ")
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
    precondition(Set(userArguments.keys) == Set(["entity", "username", "limit", "offset"]))
    precondition(userArguments["entity"] as? String == "user")
    precondition(userArguments["username"] as? String == "carlosmbinf", "La busqueda debe enviar el username exacto")
    precondition(userArguments["query"] == nil && userArguments["confirmed"] == nil)
    let profileArguments = await network.lastProfileArguments
    precondition(profileArguments["userId"] as? String == "private-user-id" && profileArguments["confirmed"] == nil)
    let confirmationCountAfterUser = await network.confirmations
    precondition(confirmationCountAfterUser == confirmationCount, "Las lecturas MCP no piden confirmación")

    func assertUserSnippet<Result: ReturnsValue<VIDKARUserSearchAppEntity> & ProvidesDialog & ShowsSnippetView>(_ result: Result) {
      precondition(result.value?.fullName == "Carlos Medina" && result.value?.username == "carlosmbinf")
      precondition(result.value?.account?.id == "fixture-owner|private-user-id")
      precondition(result.value?.id == "fixture-owner|private-user-id")
      precondition(result.value?.role == "admin" && result.value?.registeredEmailCount == 1)
      precondition(result.value?.isBanned == false && result.value?.memberSince != nil)
      precondition(result.value?.proxyUsedBytes == 512 && result.value?.proxyLimitMB == 1024)
      precondition(result.value?.vpnConnected == true && result.value?.vpnUnlimited == true)
      precondition(!VIDKARSearchUserByUsernameIntent.openAppWhenRun)
    }
    var userIntent = VIDKARSearchUserByUsernameIntent()
    userIntent.username = "carlosmbinf"
    let userResult = try await userIntent.perform()
    assertUserSnippet(userResult)
    let mainEntity = try VIDKARUserSearchAppEntity(profile: profileFixture, ownerId: "fixture-owner")
    let profileQuery = VIDKARUserSearchAppEntityQuery()
    let noUserSuggestions = try await profileQuery.suggestedEntities()
    precondition(noUserSuggestions.isEmpty, "No sugerir ni indexar usuarios privados")
    let legacyResult = try await profileQuery.entities(for: [UUID().uuidString])
    precondition(legacyResult.isEmpty, "No convertir UUID transitorios antiguos en el usuario actual")
    let persistedUser = try await profileQuery.entities(for: [mainEntity.id])
    precondition(persistedUser.count == 1 && persistedUser[0].vpnUsedBytes == 256)
    let searchedUser = try await profileQuery.entities(matching: "carlosmbinf")
    precondition(searchedUser.count == 1 && searchedUser[0].id == mainEntity.id)
    let otherUserEntity = try VIDKARUserSearchAppEntity(profile: profileFixture, ownerId: "other-owner")
    let callsBeforeOtherOwner = await network.calls
    do { _ = try await profileQuery.entities(for: [otherUserEntity.id]); preconditionFailure("No resolver usuarios de otro owner") }
    catch MCPError.ownerMismatch {}
    let callsAfterOtherOwner = await network.calls
    precondition(callsBeforeOtherOwner == callsAfterOtherOwner)
    var profileIntent = VIDKARGetUserProfileIntent()
    profileIntent.user = mainEntity
    let profileResult = try await profileIntent.perform()
    assertUserSnippet(profileResult)
    let refreshedArguments = await network.lastProfileArguments
    precondition(refreshedArguments["userId"] as? String == "private-user-id")
    profileIntent.user = otherUserEntity
    do { _ = try await profileIntent.perform(); preconditionFailure("No consultar un perfil de otro owner") }
    catch MCPCatalogQuery.Failure.authentication {}
    profileIntent.user = mainEntity
    await network.profileResponse("{\"success\":false,\"error\":{\"code\":\"USER_NOT_FOUND\"}}")
    let deletedUser = try await profileQuery.entities(for: [mainEntity.id])
    precondition(deletedUser.isEmpty, "Un usuario eliminado deja de resolverse")
    do { _ = try await profileIntent.perform(); preconditionFailure("No devolver un perfil eliminado") }
    catch MCPCatalogQuery.Failure.userNotFound {}
    await network.profileResponse("{\"success\":false,\"error\":{\"code\":\"MCP_FORBIDDEN\"}}")
    do { _ = try await profileQuery.entities(for: [mainEntity.id]); preconditionFailure("No ocultar un rechazo de permisos como lista vacía") }
    catch MCPCatalogQuery.Failure.forbidden {}
    await network.profileResponse(String(data: profileData, encoding: .utf8))
    let helpResult = try await VIDKARGetCapabilitiesIntent().perform()
    precondition(helpResult.value?.summary.contains("Solo consultas") == true)
    precondition(helpResult.value?.summary.contains("username exacto") == true)
    precondition(helpResult.value?.summary.contains("mensajes") == true)
    precondition(!VIDKARGetCapabilitiesIntent.openAppWhenRun && !VIDKARGetUserProfileIntent.openAppWhenRun)
    let photo = try await FixtureUserAvatar.load(from: URL(string: avatarURL)!)
    precondition(userResult.value?.displayRepresentation.image ==
      DisplayRepresentation.Image(data: photo.data, displayStyle: .circular), "La entidad debe contener la miniatura cargada")
    let avatarFailures: [Error] = [VIDKARUserAvatar.Failure.invalidImage, URLError(.notConnectedToInternet)]
    for failure in avatarFailures {
      FixtureUserAvatar.failure = failure
      let withoutPhoto = try await userIntent.perform()
      assertUserSnippet(withoutPhoto)
      precondition(withoutPhoto.value?.displayRepresentation.image ==
        DisplayRepresentation.Image(systemName: "person.crop.circle", isTemplate: true))
    }
    let cancellations: [Error] = [CancellationError(), URLError(.cancelled)]
    for cancellation in cancellations {
      FixtureUserAvatar.failure = cancellation
      do { _ = try await userIntent.perform(); preconditionFailure("No entregar ficha cancelada") }
      catch is CancellationError {}
    }
    FixtureUserAvatar.failure = nil
    FixtureUserAvatar.logout = true
    do { _ = try await userIntent.perform(); preconditionFailure("No entregar ficha tras logout durante avatar") }
    catch MCPCatalogQuery.Failure.expired {}
    FixtureUserAvatar.logout = false
    try await configure()
    await network.response(try json([userPayload]))
    await network.profileResponse(String(data: profileData, encoding: .utf8))
    for owner in ["fixture-owner", "other-owner"] {
      FixtureUserAvatar.rotatedOwner = owner
      do { _ = try await userIntent.perform(); preconditionFailure("No entregar ficha tras rotacion durante avatar") }
      catch MCPCatalogQuery.Failure.expired {}
      FixtureUserAvatar.rotatedOwner = nil
      try await configure()
      await network.response(try json([userPayload]))
      await network.profileResponse(String(data: profileData, encoding: .utf8))
    }
    let confirmationCountAfterSnippet = await network.confirmations
    precondition(confirmationCountAfterSnippet == confirmationCount, "La ficha no reintroduce prompts MCP")

    await network.response(try json([["id": "similar", "type": "user", "title": "Carlos", "subtitle": "@carlosmbinf-extra"]]))
    let noMatch = try await queryVIDKARUserByUsername("carlosmbinf")
    if case .notFound = noMatch { } else { preconditionFailure("No debe aceptar un username parcial") }

    await network.response(try json([userPayload, userPayload]))
    let ambiguous = try await queryVIDKARUserByUsername("carlosmbinf")
    if case .ambiguous = ambiguous { } else { preconditionFailure("No debe escoger arbitrariamente un usuario duplicado") }

    await network.response()
    let callsBeforeInvalidUsername = await network.calls
    do {
      _ = try await queryVIDKARUserByUsername("   ")
      preconditionFailure("Debe rechazar username vacío antes de consultar")
    } catch MCPCatalogQuery.Failure.invalidQuery { }
    let callsAfterInvalidUsername = await network.calls
    precondition(callsAfterInvalidUsername == callsBeforeInvalidUsername)

    // Un catálogo desplegado anterior no anuncia el nuevo argumento username.
    await network.usernameSchema(false)
    let legacyUser: [String: Any] = ["id": "legacy-user-id", "type": "user", "title": "Usuario de prueba", "subtitle": "@fixture-user"]
    await network.response(try json([legacyUser]))
    let legacyOutcome = try await queryVIDKARUserByUsername("fixture-user")
    guard case .found(_, "fixture-user", _, _) = legacyOutcome else { preconditionFailure("Debe soportar el catálogo anterior") }
    let legacyArguments = await network.lastArguments
    precondition(legacyArguments["username"] == nil && legacyArguments["query"] as? String == "fixture-user")
    precondition(legacyArguments["confirmed"] == nil)
    func pageJSON(_ rows: [[String: Any]], hasMore: Bool) throws -> String {
      String(decoding: try JSONSerialization.data(withJSONObject: ["success": true, "results": rows,
        "pagination": ["hasMore": hasMore]]), as: UTF8.self)
    }
    let partialUser: [String: Any] = ["type": "user", "title": "Prueba", "subtitle": "@fixture-user-extra"]
    await network.response()
    await network.paginatedResponses([try pageJSON([partialUser], hasMore: true), try pageJSON([legacyUser], hasMore: false)])
    let beforePaging = await network.confirmations
    let pagedOutcome = try await queryVIDKARUserByUsername("FIXTURE-user")
    guard case .found(_, "fixture-user", _, _) = pagedOutcome else { preconditionFailure("Debe revisar páginas y comparar sin distinguir mayúsculas") }
    let pagedCalls = await network.calls
    let pagedConfirmations = await network.confirmations
    let pagedArguments = await network.lastArguments
    precondition(pagedCalls == 2 && pagedConfirmations == beforePaging)
    precondition(pagedArguments["offset"] as? Int == 50 && pagedArguments["confirmed"] == nil)

    await network.response(try pageJSON([partialUser], hasMore: true))
    do {
      _ = try await queryVIDKARUserByUsername("fixture-user")
      preconditionFailure("No afirmar ausencia con resultados truncados")
    } catch MCPCatalogQuery.Failure.incompatibleSchema { }
    let boundedCalls = await network.calls
    precondition(boundedCalls == 4)

    for (code, expected) in [("MCP_FORBIDDEN", MCPCatalogQuery.Failure.forbidden),
                              ("MCP_UNAUTHORIZED", .authentication),
                              ("MCP_CONFIRMATION_REQUIRED", .confirmationRequired)] {
      await network.response("{\"success\":false,\"error\":{\"code\":\"\(code)\",\"message\":\"NO_LEER\"}}")
      do {
        _ = try await queryVIDKARUserByUsername("fixture-user")
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
        _ = try await queryVIDKARUserByUsername("fixture-user")
        preconditionFailure("Debe respetar HTTP auth")
      } catch { precondition(catalogFailure(error) == expected) }
    }
    try await configure()
    await network.response()
    await transport.clearConfiguration()
    do {
      _ = try await queryVIDKARUserByUsername("fixture-user")
      preconditionFailure("No consultar tras logout")
    } catch MCPError.notConfigured { }
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
    try await configure()
    func payload(_ value: [String: Any]) throws -> String {
      String(decoding: try JSONSerialization.data(withJSONObject: value), as: UTF8.self)
    }
    let account = try VIDKARAccountUserAppEntity(profile: profileFixture, ownerId: "fixture-owner")
    precondition(account.id == "fixture-owner|private-user-id")
    let suggestions = try await VIDKARAccountUserEntityQuery().suggestedEntities()
    precondition(suggestions.isEmpty)
    await network.response(try json([userPayload]))
    await network.profileResponse(try payload(profileFixture))
    let matchingAccount = try await VIDKARAccountUserEntityQuery().entities(matching: "carlosmbinf")
    precondition(matchingAccount.count == 1 && matchingAccount[0].id == account.id)
    await network.profileResponse(try payload(profileFixture))
    let resolvedAccount = try await VIDKARAccountUserEntityQuery().entities(for: [account.id])
    precondition(resolvedAccount.count == 1 && resolvedAccount[0].username == "carlosmbinf")
    let crossOwner = try VIDKARAccountUserAppEntity(profile: profileFixture, ownerId: "another-owner")
    do {
      _ = try await VIDKARAccountUserEntityQuery().entities(for: [crossOwner.id])
      preconditionFailure("No resolver una entidad de otra cuenta")
    } catch MCPError.ownerMismatch { }
    func assertRead<Result: ReturnsValue<VIDKARReadReportEntity> & ProvidesDialog & ShowsSnippetView>(_ result: Result) -> String {
      precondition(result.value != nil)
      return result.value!.summary
    }
    var usageIntent = VIDKARGetUserServiceUsageIntent()
    usageIntent.user = account; usageIntent.service = .vpn
    await network.response(try payload(profileFixture))
    let usageSummary = assertRead(try await usageIntent.perform())
    precondition(usageSummary.contains("Sin límite") && !usageSummary.contains("fixture.example"))
    var salesIntent = VIDKARGetUserSalesIntent()
    salesIntent.user = account; salesIntent.period = .last_month
    let financeFixture: [String: Any] = ["success": true, "total": 2, "totalSales": 2, "userId": "private-user-id",
      "period": ["from": "2026-09-01T00:00:00Z", "to": "2026-10-01T00:00:00Z"],
      "sales": [
        ["service": "COMERCIO", "amount": 10, "currency": "USD", "status": "PAID", "description": "NO_EXPORTAR"],
        ["service": "PROXY", "amount": 500, "currency": "CUP", "status": "PENDING", "paymentId": "NO_EXPORTAR"],
      ]]
    await network.response(try payload(financeFixture))
    let salesSummary = assertRead(try await salesIntent.perform())
    precondition(salesSummary.contains("10.00 USD") && salesSummary.contains("500.00 CUP"))
    precondition(!salesSummary.contains("510") && !salesSummary.contains("NO_EXPORTAR"))
    let salesArguments = await network.lastArguments
    precondition(salesArguments["userId"] as? String == "private-user-id" && salesArguments["period"] as? String == "last_month")
    precondition(salesArguments["limit"] as? Int == 5 && salesArguments["confirmed"] == nil)
    salesIntent.user = nil
    await network.response("{\"success\":true,\"total\":0,\"sales\":[]}")
    let emptySales = assertRead(try await salesIntent.perform())
    precondition(emptySales.contains("No hay registros"))
    let ownSalesArguments = await network.lastArguments
    precondition(ownSalesArguments["userId"] as? String == "fixture-owner")
    salesIntent.user = crossOwner
    do { _ = try await salesIntent.perform(); preconditionFailure("No usar una entidad de otra sesión") }
    catch MCPError.ownerMismatch { }
    salesIntent.user = account
    for invalid in ["{}", "{\"success\":true}", "{\"success\":true,\"total\":1,\"sales\":[{}]}",
      "{\"success\":true,\"total\":0,\"sales\":[{\"amount\":1}]}"] {
      await network.response(invalid)
      do { _ = try await salesIntent.perform(); preconditionFailure("No fabricar una venta válida") }
      catch { }
    }
    await network.response(try payload(financeFixture), readOnly: false)
    do { _ = try await salesIntent.perform(); preconditionFailure("No ejecutar herramientas de escritura") }
    catch MCPError.toolNotAllowed { }
    try await configure()
    var recordsIntent = VIDKARGetUserRecordsIntent()
    recordsIntent.user = account; recordsIntent.records = .purchases
    await network.response(try payload(financeFixture))
    let purchasesSummary = assertRead(try await recordsIntent.perform())
    precondition(purchasesSummary.contains("10.00 USD"))
    recordsIntent.records = .orders
    await network.response("{\"success\":true,\"orders\":[{\"status\":\"PENDING\",\"createdAt\":\"2026-10-01\"}],\"pagination\":{\"total\":1}}")
    let ordersSummary = assertRead(try await recordsIntent.perform())
    precondition(ordersSummary.contains("PENDING"))
    recordsIntent.records = .profile
    await network.profileResponse(try payload(profileFixture))
    let extraProfile = assertRead(try await recordsIntent.perform())
    precondition(extraProfile.contains("admin") && !extraProfile.contains("fixture.example") && !extraProfile.contains("emailCount"))
    var businessIntent = VIDKARGetBusinessReportIntent()
    await network.response("{\"success\":true,\"totalSales\":4,\"completedSales\":2,\"cancelledSales\":1,\"failedSales\":1,\"totalRevenue\":123456}")
    let businessSummary = assertRead(try await businessIntent.perform())
    precondition(businessSummary.contains("Ventas: 4") && !businessSummary.contains("123456"))
    businessIntent.report = .payments
    await network.response("{\"success\":true,\"payments\":[{\"amount\":2,\"currency\":\"USD\",\"status\":\"PAID\",\"paymentId\":\"NO_EXPORTAR\"}]}")
    let paymentsSummary = assertRead(try await businessIntent.perform())
    precondition(paymentsSummary.contains("2.00 USD"))
    for kind in [VIDKARBusinessReportKind.costs, .profitability] {
      businessIntent.report = kind
      await network.response("{\"success\":true,\"recordedProfit\":100,\"limitations\":[\"No hay libro general de costos.\"]}")
      let summary = assertRead(try await businessIntent.perform())
      precondition(summary.contains("No hay libro general") && !summary.contains("100"))
    }
    var personalIntent = VIDKARGetMyRecordsIntent()
    for kind in [VIDKARPersonalRecordKind.message, .subscription] {
      personalIntent.records = kind
      await network.response(try payload(["success": true,
        "results": [["type": kind.rawValue, "title": "Consulta propia", "subtitle": "Estado", "privateField": "NO_EXPORTAR"]],
        "pagination": ["total": 8]]))
      let ownSummary = assertRead(try await personalIntent.perform())
      precondition(ownSummary.contains("8 registros; primeros 1.") && !ownSummary.contains("NO_EXPORTAR"))
      let personalArguments = await network.lastArguments
      precondition(personalArguments["entity"] as? String == kind.rawValue && personalArguments["userId"] == nil)
    }
    try await configure()
    await network.response(try payload(financeFixture))
    await network.pause(at: "result")
    let staleSales = Task { try await salesIntent.perform() }
    await network.waitUntilBlocked()
    try await transport.configure(url: "https://vidkar.com/mcp", token: "fixture-rotated-not-a-secret", ownerId: "fixture-owner")
    await network.resume()
    do { _ = try await staleSales.value; preconditionFailure("No mostrar ventas de una revisión anterior") }
    catch MCPQueryError.expired { }
    await transport.clearConfiguration()
    print("perform real: catálogo y tarjetas; usuario resoluble sin sugerencias; consumo, ventas multimoneda, compras, órdenes, perfil y negocio; errores, privacidad y aislamiento de sesión: PASS")
  }
}