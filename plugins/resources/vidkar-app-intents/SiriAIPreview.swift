#if VIDKAR_SIRI_AI_PREVIEW
import Foundation
import SwiftUI
import UIKit

@available(iOS 27.3, *)
enum VIDKARSiriResultState: String, AppEnum {
  case available, noMatches, unavailable
  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Estado de consulta VIDKAR")
  static let caseDisplayRepresentations: [Self: DisplayRepresentation] = [
    .available: "Resultado disponible",
    .noMatches: "Sin coincidencias",
    .unavailable: "Consulta no disponible",
  ]
}

private struct VIDKARSiriCardRow: Sendable {
  let title: String
  var subtitle = ""
  var detail = ""
  var badge = ""
  var thumbnail: Data?

  var summary: String {
    [title, subtitle, badge, detail].filter { !$0.isEmpty }.joined(separator: " · ")
  }
}

@available(iOS 27.3, *)
struct VIDKARSiriResult: TransientAppEntity, SnippetRepresentableEntity {
  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Resultado de VIDKAR")
  static let defaultQuery = VIDKARSiriResultQuery()
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  var id = UUID().uuidString
  @Property(title: "Resultado", description: "Título del resultado de VIDKAR")
  var title: String
  @Property(title: "Detalle", description: "Datos verificados devueltos por VIDKAR o mensaje si la consulta no pudo completarse")
  var summary: String
  @Property(title: "Estado", description: "Distingue resultados disponibles, búsqueda vacía y errores de consulta")
  var state: VIDKARSiriResultState

  fileprivate var subtitle = ""
  fileprivate var symbol = "magnifyingglass"
  fileprivate var rows: [VIDKARSiriCardRow] = []
  fileprivate var message = ""

  init() {
    title = ""
    summary = ""
    state = .noMatches
  }

  fileprivate init(title: String, subtitle: String = "", symbol: String,
                   rows: [VIDKARSiriCardRow], emptyMessage: String) {
    self.init()
    self.title = title
    self.subtitle = subtitle
    self.symbol = symbol
    self.rows = rows
    state = rows.isEmpty ? .noMatches : .available
    message = rows.isEmpty ? emptyMessage : ""
    summary = rows.isEmpty ? emptyMessage : rows.map(\.summary).joined(separator: "\n")
  }

  fileprivate init(report: VIDKARReadReportEntity, symbol: String) {
    let lines = report.summary.split(separator: "\n").map { VIDKARSiriCardRow(title: String($0)) }
    self.init(title: report.title, subtitle: report.subtitle, symbol: symbol,
      rows: lines, emptyMessage: "VIDKAR no devolvió datos para esta consulta.")
  }

  fileprivate init(errorMessage: String) {
    self.init(title: "Consulta VIDKAR", symbol: "exclamationmark.circle", rows: [], emptyMessage: errorMessage)
    state = .unavailable
  }

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(title)",
      subtitle: "\(rows.first?.summary ?? message)",
      image: .init(systemName: symbol, isTemplate: true))
  }

  static var snippet: some EntitySnippetContent<Self> {
    CardSnippet(supportedFamilies: [.standard]) { result, _ in
      VIDKARSiriCardView(result: result)
    }
  }

  fileprivate func dialog(readDetails: Bool) -> IntentDialog {
    guard state == .available else { return IntentDialog(stringLiteral: message) }
    let supporting = "\(title)."
    guard readDetails else { return IntentDialog(stringLiteral: supporting) }
    let spokenRows = rows.prefix(3).map { [$0.title, $0.badge, $0.subtitle].filter { !$0.isEmpty }.joined(separator: ", ") }
    let additional = rows.count > 3 ? " Hay más resultados en la tarjeta." : ""
    return IntentDialog(full: "\(supporting) \(spokenRows.joined(separator: ". ")).\(additional)",
      supporting: "\(supporting)")
  }
}

@available(iOS 27.3, *)
struct VIDKARSiriResultQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [VIDKARSiriResult] { [] }
  func suggestedEntities() async throws -> [VIDKARSiriResult] { [] }
}

@available(iOS 27.3, *)
private struct VIDKARSiriCardView: View {
  let result: VIDKARSiriResult

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      Label {
        VStack(alignment: .leading, spacing: 3) {
          Text(verbatim: result.title).font(.headline)
          if !result.subtitle.isEmpty {
            Text(verbatim: result.subtitle).font(.caption).foregroundStyle(.secondary)
          }
        }
      } icon: {
        Image(systemName: result.symbol).foregroundStyle(.teal)
      }
      .accessibilityAddTraits(.isHeader)

      if result.rows.isEmpty {
        Text(verbatim: result.message).font(.subheadline).foregroundStyle(.secondary)
      }

      ForEach(Array(result.rows.indices), id: \.self) { index in
        Divider()
        row(result.rows[index])
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(14)
  }

  private func row(_ row: VIDKARSiriCardRow) -> some View {
    HStack(alignment: .top, spacing: 10) {
      if let data = row.thumbnail, let image = UIImage(data: data) {
        Image(uiImage: image)
          .resizable()
          .scaledToFill()
          .frame(width: 48, height: 48)
          .clipShape(RoundedRectangle(cornerRadius: 9))
          .accessibilityHidden(true)
      }
      VStack(alignment: .leading, spacing: 4) {
        Text(verbatim: row.title).font(.subheadline.weight(.medium))
        if !row.badge.isEmpty {
          Text(verbatim: row.badge).font(.subheadline.weight(.semibold)).foregroundStyle(.teal)
        }
        if !row.subtitle.isEmpty {
          Text(verbatim: row.subtitle).font(.caption).foregroundStyle(.secondary)
        }
        if !row.detail.isEmpty {
          Text(verbatim: row.detail).font(.caption).lineLimit(3)
        }
      }
    }
    .accessibilityElement(children: .combine)
  }
}

@available(iOS 27.3, *)
private func vidkarSiriCard(_ operation: () async throws -> VIDKARSiriResult) async throws -> VIDKARSiriResult {
  do {
    let result = try await operation()
    try Task.checkCancellation()
    return result
  } catch {
    if error is CancellationError || (error as? URLError)?.code == .cancelled { throw CancellationError() }
    try Task.checkCancellation()
    return VIDKARSiriResult(errorMessage: vidkarSiriFailureMessage(for: error))
  }
}

@available(iOS 27.3, *)
@AppIntent(.tool)
struct VIDKARSiriPreviewProductSearchIntent: AppIntent {
  static let title: LocalizedStringResource = "Explora el catálogo de productos de VIDKAR"
  static let description = IntentDescription("Busca o lista artículos de Comercio con precio, tienda e imagen disponible.")
  static let supportedModes: IntentModes = .background
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Producto", description: "Tipo o modelo breve, como PS5 o USB-C. Omítelo para ver qué hay.")
  var query: String?

  func perform() async throws -> some IntentResult & ReturnsValue<VIDKARSiriResult> & ProvidesDialog {
    let card = try await vidkarSiriCard {
      let products = try await VIDKARCommerceCatalog.products(matching: query, includeThumbnails: true)
      let rows = products.map { product in
        var price = "Precio no informado"
        if let amount = product.price, amount.isFinite, amount > 0,
           let currency = product.currency, currency.range(of: "^[A-Z]{3}$", options: .regularExpression) != nil {
          price = "\(amount.formatted(.number.precision(.fractionLength(2)))) \(currency)"
        }
        return VIDKARSiriCardRow(title: product.name, subtitle: product.storeName ?? "",
          detail: product.description ?? "", badge: price, thumbnail: product.thumbnailData)
      }
      return VIDKARSiriResult(title: "Productos de Comercio", subtitle: query ?? "", symbol: "shippingbox",
        rows: rows, emptyMessage: "No encontré productos para esta consulta en VIDKAR.")
    }
    return .result(value: card, dialog: card.dialog(readDetails: true))
  }
}

@available(iOS 27.3, *)
enum VIDKARSiriContentKind: String, AppEnum {
  case movie, series, episode, course, lesson, product
  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Tipo de contenido VIDKAR")
  static let caseDisplayRepresentations: [Self: DisplayRepresentation] = [
    .movie: "Películas", .series: "Series", .episode: "Capítulos", .course: "Cursos",
    .lesson: "Lecciones", .product: "Productos y recargas",
  ]

  var presentation: (kind: VIDKARSiriContentCatalog.Kind, title: String, symbol: String) {
    switch self {
    case .movie: return (.movie, "Películas", "film")
    case .series: return (.series, "Series", "tv")
    case .episode: return (.episode, "Capítulos", "play.rectangle")
    case .course: return (.course, "Cursos", "graduationcap")
    case .lesson: return (.lesson, "Lecciones", "book")
    case .product: return (.product, "Productos y recargas", "shippingbox")
    }
  }
}

@available(iOS 27.3, *)
@AppIntent(.tool)
struct VIDKARSiriPreviewContentSearchIntent: AppIntent {
  static let title: LocalizedStringResource = "Busca contenido y recargas en VIDKAR"
  static let description = IntentDescription("Consulta películas, series, capítulos, cursos, lecciones y productos o recargas del catálogo autorizado.")
  static let supportedModes: IntentModes = .background
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Catálogo", description: "Tipo de contenido que la persona quiere consultar.")
  var kind: VIDKARSiriContentKind
  @Parameter(title: "Título o término", description: "Nombre o término breve. Puedes omitirlo para listar cursos.")
  var query: String?

  func perform() async throws -> some IntentResult & ReturnsValue<VIDKARSiriResult> & ProvidesDialog {
    let card = try await vidkarSiriCard {
      let presentation = kind.presentation
      let items = try await VIDKARSiriContentCatalog.search(presentation.kind, matching: query)
      let rows = items.map { VIDKARSiriCardRow(title: $0.title, subtitle: $0.subtitle, detail: $0.detail, thumbnail: $0.imageData) }
      return VIDKARSiriResult(title: presentation.title, subtitle: query ?? "", symbol: presentation.symbol,
        rows: rows, emptyMessage: "No encontré coincidencias en este catálogo de VIDKAR.")
    }
    return .result(value: card, dialog: card.dialog(readDetails: true))
  }
}

@available(iOS 27.3, *)
@AppIntent(.tool)
struct VIDKARSiriPreviewUserSearchIntent: AppIntent {
  static let title: LocalizedStringResource = "Busca usuarios y muestra su perfil en VIDKAR"
  static let description = IntentDescription("Encuentra usuarios autorizados por username o nombre completo. Localiza también el perfil propio.")
  static let supportedModes: IntentModes = .background
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Usuario", description: "Username o nombre completo. Omítelo solo cuando la persona pide su propio perfil.")
  var query: String?

  func perform() async throws -> some IntentResult & ReturnsValue<VIDKARSiriResult> & ProvidesDialog {
    let card = try await vidkarSiriCard {
      let users = try await VIDKARSiriUserDirectory.search(query)
      let rows = users.map { user in
        let membership = user.memberSince.map { "Miembro desde \($0.formatted(date: .abbreviated, time: .omitted))" }
        let account = user.isBanned.map { $0 ? "Cuenta bloqueada" : "Cuenta sin bloqueo" }
        let details = [user.role, membership, account].compactMap { $0 }.filter { !$0.isEmpty }
        return VIDKARSiriCardRow(title: user.fullName, subtitle: "@\(user.username)",
          detail: details.joined(separator: " · "), thumbnail: user.avatarImageData)
      }
      let title = rows.count == 1 ? "Perfil VIDKAR" : "Usuarios de VIDKAR"
      let subtitle = rows.count > 1 ? "Usa el @usuario para consultar una cuenta" : ""
      return VIDKARSiriResult(title: title, subtitle: subtitle, symbol: "person.crop.circle",
        rows: rows, emptyMessage: "No encontré ese usuario dentro de tu acceso autorizado.")
    }
    return .result(value: card, dialog: card.dialog(readDetails: false))
  }
}

@available(iOS 27.3, *)
@AppIntent(.tool)
struct VIDKARSiriPreviewServiceUsageIntent: AppIntent {
  static let title: LocalizedStringResource = "Consulta consumo de Proxy y VPN en VIDKAR"
  static let description = IntentDescription("Muestra uso actual, estado, límite y vencimiento de Proxy y VPN para una cuenta autorizada.")
  static let supportedModes: IntentModes = .background
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Usuario", description: "Username o nombre completo. Omítelo solo para consultar el consumo propio.")
  var username: String?
  @Parameter(title: "Servicio", description: "Proxy o VPN. Si la persona pide el consumo general, omite el servicio para ver ambos.")
  var service: VIDKARAccountService?

  func perform() async throws -> some IntentResult & ReturnsValue<VIDKARSiriResult> & ProvidesDialog {
    let card = try await vidkarSiriCard {
      let user = try await VIDKARSiriUserDirectory.account(matching: username)
      let report = try await VIDKARGetUserServiceUsageIntent.read(user: user, service: service)
      return VIDKARSiriResult(report: report, symbol: "gauge.with.dots.needle.33percent")
    }
    return .result(value: card, dialog: card.dialog(readDetails: false))
  }
}

@available(iOS 27.3, *)
enum VIDKARSiriAccountActivity: String, AppEnum {
  case purchases, orders, sales
  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Actividad de cuenta VIDKAR")
  static let caseDisplayRepresentations: [Self: DisplayRepresentation] = [
    .purchases: "Compras", .orders: "Órdenes", .sales: "Ventas asociadas",
  ]
}

@available(iOS 27.3, *)
@AppIntent(.tool)
struct VIDKARSiriPreviewUserActivityIntent: AppIntent {
  static let title: LocalizedStringResource = "Consulta compras, órdenes y ventas de una cuenta VIDKAR"
  static let description = IntentDescription("Muestra actividad reciente de la cuenta indicada y permite consultar por período. Las ventas están asociadas a esa cuenta.")
  static let supportedModes: IntentModes = .background
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Actividad", description: "Elige compras, órdenes o ventas asociadas a una cuenta.")
  var activity: VIDKARSiriAccountActivity
  @Parameter(title: "Usuario", description: "Username o nombre completo. Omítelo solo para consultar la cuenta propia.")
  var username: String?
  @Parameter(title: "Período", description: "Período indicado por la persona. El valor por omisión es este mes.", default: .this_month)
  var period: VIDKARReadPeriod

  func perform() async throws -> some IntentResult & ReturnsValue<VIDKARSiriResult> & ProvidesDialog {
    let card = try await vidkarSiriCard {
      let user = try await VIDKARSiriUserDirectory.account(matching: username)
      let report: VIDKARReadReportEntity?
      if activity == .sales {
        let intent = VIDKARGetUserSalesIntent()
        intent.user = user
        intent.period = period
        report = try await intent.perform().value
      } else {
        let intent = VIDKARGetUserRecordsIntent()
        intent.user = user
        intent.records = activity == .orders ? .orders : .purchases
        intent.period = period
        report = try await intent.perform().value
      }
      guard let report else { return VIDKARSiriResult(errorMessage: "VIDKAR no devolvió el informe solicitado.") }
      var result = VIDKARSiriResult(report: report, symbol: "list.bullet.rectangle")
      let account = user.map { "@\($0.username)" } ?? "Mi cuenta"
      result.subtitle = [account, report.subtitle].filter { !$0.isEmpty }.joined(separator: " · ")
      return result
    }
    return .result(value: card, dialog: card.dialog(readDetails: false))
  }
}

@available(iOS 27.3, *)
@AppIntent(.tool)
struct VIDKARSiriPreviewPersonalRecordsIntent: AppIntent {
  static let title: LocalizedStringResource = "Consulta mis mensajes o suscripciones en VIDKAR"
  static let description = IntentDescription("Muestra mensajes y suscripciones de tu cuenta. La consulta de mensajes conserva su estado de lectura.")
  static let supportedModes: IntentModes = .background
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Datos", description: "Elige mensajes o suscripciones de la cuenta propia.")
  var records: VIDKARPersonalRecordKind
  @Parameter(title: "Búsqueda", description: "Texto opcional para filtrar mensajes o nombre de la suscripción.")
  var query: String?
  @Parameter(title: "Período", description: "Período solicitado. Omítelo si no se indicó fecha.")
  var period: VIDKARReadPeriod?

  func perform() async throws -> some IntentResult & ReturnsValue<VIDKARSiriResult> & ProvidesDialog {
    let card = try await vidkarSiriCard {
      let intent = VIDKARGetMyRecordsIntent()
      intent.records = records
      intent.query = query ?? ""
      intent.period = period
      guard let report = try await intent.perform().value else {
        return VIDKARSiriResult(errorMessage: "VIDKAR no devolvió los datos solicitados.")
      }
      return VIDKARSiriResult(report: report, symbol: records == .message ? "bubble.left.and.bubble.right" : "checkmark.seal")
    }
    return .result(value: card, dialog: card.dialog(readDetails: false))
  }
}

@available(iOS 27.3, *)
@AppIntent(.tool)
struct VIDKARSiriPreviewBusinessIntent: AppIntent {
  static let title: LocalizedStringResource = "Consulta el negocio de VIDKAR"
  static let description = IntentDescription("Muestra resumen de ventas, pagos, costos registrados o rentabilidad según el acceso autorizado.")
  static let supportedModes: IntentModes = .background
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Informe", description: "Informe solicitado sobre el negocio o sus ventas totales.", default: .summary)
  var report: VIDKARBusinessReportKind
  @Parameter(title: "Período", description: "Período solicitado. El valor por omisión es este mes.", default: .this_month)
  var period: VIDKARReadPeriod

  func perform() async throws -> some IntentResult & ReturnsValue<VIDKARSiriResult> & ProvidesDialog {
    let card = try await vidkarSiriCard {
      let intent = VIDKARGetBusinessReportIntent()
      intent.report = report
      intent.period = period
      guard let value = try await intent.perform().value else {
        return VIDKARSiriResult(errorMessage: "VIDKAR no devolvió el informe solicitado.")
      }
      return VIDKARSiriResult(report: value, symbol: "chart.bar")
    }
    return .result(value: card, dialog: card.dialog(readDetails: false))
  }
}

@available(iOS 27.3, *)
@AppIntent(.tool)
struct VIDKARSiriPreviewCapabilitiesIntent: AppIntent {
  static let title: LocalizedStringResource = "Qué puedo hacer con VIDKAR en Siri"
  static let description = IntentDescription("Enumera las consultas disponibles en Siri y el alcance de los datos de VIDKAR.")
  static let supportedModes: IntentModes = .background
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  func perform() async throws -> some IntentResult & ReturnsValue<VIDKARSiriResult> & ProvidesDialog {
    try Task.checkCancellation()
    let rows = [
      VIDKARSiriCardRow(title: "Catálogos", detail: "Comercio, recargas, películas, series, capítulos, cursos y lecciones."),
      VIDKARSiriCardRow(title: "Usuarios y consumo", detail: "Perfiles autorizados y consumo actual de Proxy y VPN."),
      VIDKARSiriCardRow(title: "Actividad de cuenta", detail: "Compras, órdenes, ventas asociadas, mensajes propios y suscripciones."),
      VIDKARSiriCardRow(title: "Negocio", detail: "Ventas, pagos, costos registrados y rentabilidad según tus permisos."),
    ]
    let card = VIDKARSiriResult(title: "Qué puedes consultar", symbol: "list.bullet", rows: rows, emptyMessage: "")
    return .result(value: card, dialog: "Puedes consultar catálogos, usuarios, consumo, actividad de tu cuenta e informes del negocio.")
  }
}
#endif
