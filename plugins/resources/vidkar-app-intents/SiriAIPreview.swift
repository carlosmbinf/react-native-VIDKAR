#if VIDKAR_SIRI_AI_PREVIEW
import Foundation
import SwiftUI

@available(iOS 27.3, *)
struct VIDKARSiriCatalogProduct: TransientAppEntity, SnippetRepresentableEntity {
  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Producto de VIDKAR")
  static let defaultQuery = VIDKARSiriCatalogProductQuery()
  var id = UUID().uuidString

  @Property(title: "Nombre", description: "Nombre del producto en el catálogo de VIDKAR")
  var name: String
  @Property(title: "Tienda", description: "Tienda que publica el producto")
  var store: String
  @Property(title: "Precio", description: "Precio de catálogo con moneda, si VIDKAR lo informó")
  var price: String

  init() {
    name = ""
    store = ""
    price = ""
  }

  init(product: VIDKARCommerceCatalog.Product) {
    self.init()
    name = product.name
    store = product.storeName ?? ""
    if let amount = product.price, amount.isFinite, amount > 0,
       let currency = product.currency, currency.range(of: "^[A-Z]{3}$", options: .regularExpression) != nil {
      price = "\(amount.formatted(.number.precision(.fractionLength(2)))) \(currency)"
    }
  }

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(name)", subtitle: "\(price)")
  }

  static var snippet: some EntitySnippetContent<Self> {
    CardSnippet(supportedFamilies: [.standard]) { product, _ in
      VStack(alignment: .leading, spacing: 6) {
        Text(verbatim: product.name).font(.headline)
        if !product.store.isEmpty {
          Text(verbatim: product.store).font(.subheadline).foregroundStyle(.secondary)
        }
        if !product.price.isEmpty {
          Text(verbatim: product.price).font(.subheadline)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding()
    }
  }
}

@available(iOS 27.3, *)
struct VIDKARSiriCatalogProductQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [VIDKARSiriCatalogProduct] { [] }
  func suggestedEntities() async throws -> [VIDKARSiriCatalogProduct] { [] }
}

@available(iOS 27.3, *)
@AppIntent(.tool)
struct VIDKARSiriPreviewProductSearchIntent: AppIntent {
  static let title: LocalizedStringResource = "Explora el catálogo de productos de VIDKAR"
  static let description = IntentDescription(
    "Muestra productos reales del catálogo de Comercio de VIDKAR sin abrir la app. Sirve para ver qué hay en la tienda o buscar un artículo. Devuelve hasta cinco productos con nombre, tienda y precio disponible."
  )
  static let supportedModes: IntentModes = .background
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Producto", description: "Término breve que aparezca en el catálogo, como PS5, USB-C o iPhone 17. Usa el modelo o término más distintivo, sin copiar la pregunta completa. Omite el parámetro cuando la persona solo quiera ver el catálogo.")
  var query: String?

  func perform() async throws -> some IntentResult & ReturnsValue<[VIDKARSiriCatalogProduct]> & ProvidesDialog {
    let products: [VIDKARSiriCatalogProduct]
    do {
      products = try await VIDKARCommerceCatalog.products(matching: query).map { VIDKARSiriCatalogProduct(product: $0) }
    } catch is CancellationError {
      throw CancellationError()
    } catch {
      try Task.checkCancellation()
      throw AppIntentError(description: "No pude consultar el catálogo de VIDKAR. Revisa la conexión y la configuración MCP de tu cuenta.")
    }

    try Task.checkCancellation()
    let dialog: IntentDialog = products.isEmpty
      ? "No encontré productos para esta consulta en VIDKAR."
      : "Encontré estos productos en VIDKAR: \(products.map(\.name).joined(separator: ", "))."
    return .result(value: products, dialog: dialog)
  }
}
#endif
