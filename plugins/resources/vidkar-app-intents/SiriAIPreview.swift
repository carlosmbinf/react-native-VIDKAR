#if VIDKAR_SIRI_AI_PREVIEW
import Foundation

@available(iOS 27.3, *)
@AppIntent(.tool)
struct VIDKARSiriPreviewDiagnosticIntent: AppIntent {
  static let title: LocalizedStringResource = "Comprueba la integración nativa de Siri"
  static let description = IntentDescription(
    "Devuelve el código de diagnóstico de Siri AI para VIDKAR. Es una prueba local sin red, cuenta ni datos personales."
  )
  static let supportedModes: IntentModes = .background

  func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
    try Task.checkCancellation()
    return .result(value: "Faro Azul 27", dialog: "El código de diagnóstico de VIDKAR es Faro Azul 27.")
  }
}

@available(iOS 27.3, *)
@AppIntent(.tool)
struct VIDKARSiriPreviewProductSearchIntent: AppIntent {
  static let title: LocalizedStringResource = "Encuentra productos de Comercio"
  static let description = IntentDescription(
    "Busca por nombre en el catálogo de productos de Comercio de VIDKAR y devuelve los nombres de hasta cinco coincidencias. Es una consulta de solo lectura."
  )
  static let supportedModes: IntentModes = .background
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Producto", description: "Nombre o términos de búsqueda del producto, como cable USB-C")
  var query: String

  func perform() async throws -> some IntentResult & ReturnsValue<[String]> & ProvidesDialog {
    let names: [String]
    do {
      let products = try await VIDKARCommerceProductEntityQuery().entities(matching: query)
      try Task.checkCancellation()
      names = products.map { String(localized: $0.displayRepresentation.title) }
    } catch is CancellationError {
      throw CancellationError()
    } catch {
      try Task.checkCancellation()
      throw AppIntentError(description: "No pude consultar el catálogo de VIDKAR. Revisa la conexión y la configuración MCP de tu cuenta.")
    }

    let dialog: IntentDialog = names.isEmpty
      ? "No encontré productos que coincidan."
      : "Encontré estos productos en VIDKAR: \(names.joined(separator: ", "))."
    return .result(value: names, dialog: dialog)
  }
}
#endif
