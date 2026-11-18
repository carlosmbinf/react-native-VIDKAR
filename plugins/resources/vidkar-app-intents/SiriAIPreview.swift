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
  var detailURL: URL?
  var isPortrait = false
  var isAvatar = false

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
  fileprivate var compactSubtitle = ""
  fileprivate var profileURL: URL?
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

  var displayRepresentation: DisplayRepresentation {
    if !compactSubtitle.isEmpty {
      return DisplayRepresentation(title: "\(title)", subtitle: "\(compactSubtitle)",
        image: .init(systemName: symbol, isTemplate: true))
    }
    let row = rows.count == 1 ? rows.first : nil
    let description = row.map {
      [$0.badge, $0.subtitle, $0.detail].filter { !$0.isEmpty }.joined(separator: " · ")
    } ?? (rows.isEmpty ? summary : [subtitle, rows.prefix(2).map(\.summary).joined(separator: " · ")]
      .filter { !$0.isEmpty }.joined(separator: " · "))
    let image: DisplayRepresentation.Image
    if let thumbnail = row?.thumbnail {
      image = row?.isAvatar == true ? .init(data: thumbnail, displayStyle: .circular) : .init(data: thumbnail)
    } else {
      image = .init(systemName: symbol, isTemplate: true)
    }
    return DisplayRepresentation(title: "\(row?.title ?? title)", subtitle: "\(description)", image: image)
  }

  static var snippet: some EntitySnippetContent<Self> {
    CardSnippet(supportedFamilies: [.standard]) { result, _ in
      VIDKARSiriCardView(result: result)
    }
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
      if result.rows.count != 1 || result.rows.first?.title != result.title {
        Label {
          VStack(alignment: .leading, spacing: 3) {
            Text(verbatim: result.title).font(.headline).fixedSize(horizontal: false, vertical: true)
            if !result.subtitle.isEmpty {
              Text(verbatim: result.subtitle).font(.subheadline).foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            }
          }
        } icon: {
          Image(systemName: result.symbol).foregroundStyle(.teal)
        }
        .accessibilityAddTraits(.isHeader)
      }

      if result.rows.isEmpty {
        Text(verbatim: result.message).font(.subheadline).foregroundStyle(.secondary)
      }

      rows

      if let profileURL = result.profileURL {
        Button(intent: OpenURLIntent(profileURL)) {
          Label("Abrir perfil", systemImage: "person.crop.circle")
        }
        .buttonStyle(.bordered)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(14)
  }

  private var rows: some View {
    ForEach(result.rows.indices, id: \.self) { index in
      if index > 0 { Divider() }
      let item = result.rows[index]
      if let url = item.detailURL, url.scheme == "https" {
        Button(intent: OpenURLIntent(url)) {
          row(item)
        }
        .buttonStyle(.plain)
        .accessibilityHint("Abre el detalle en VIDKAR")
      } else if let url = item.detailURL {
        Link(destination: url) {
          row(item)
        }
        .buttonStyle(.plain)
        .accessibilityHint("Abre el detalle en VIDKAR")
      } else {
        row(item)
      }
    }
  }

  private func row(_ row: VIDKARSiriCardRow) -> some View {
    HStack(alignment: .top, spacing: 12) {
      if row.thumbnail != nil || row.detailURL != nil {
        Group {
          if let data = row.thumbnail, let image = UIImage(data: data) {
            Image(uiImage: image).resizable().scaledToFill()
          } else {
            Image(systemName: result.symbol).font(.title3).foregroundStyle(.teal)
          }
        }
        .frame(width: 60, height: row.isPortrait ? 84 : 60)
        .background(Color.teal.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: row.isAvatar ? 30 : 10))
        .accessibilityHidden(true)
      }
      VStack(alignment: .leading, spacing: 4) {
        Text(verbatim: row.title).font(.headline)
        if !row.badge.isEmpty {
          Text(verbatim: row.badge).font(.subheadline.weight(.semibold)).foregroundStyle(.teal)
        }
        if !row.subtitle.isEmpty {
          Text(verbatim: row.subtitle).font(.caption).foregroundStyle(.secondary)
        }
        if !row.detail.isEmpty {
          Text(verbatim: row.detail).font(.caption).foregroundStyle(.secondary)
        }
      }
      .fixedSize(horizontal: false, vertical: true)
      .layoutPriority(1)
      if row.detailURL != nil {
        Spacer(minLength: 4)
        Image(systemName: "chevron.right").font(.caption.weight(.semibold))
          .foregroundStyle(.secondary).accessibilityHidden(true)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .contentShape(Rectangle())
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
    if let failure = error as? VIDKARLookupError { throw failure }
    throw VIDKARLookupError(message: vidkarSiriFailureMessage(for: error))
  }
}

private struct VIDKARLookupError: LocalizedError {
  let message: String
  var errorDescription: String? { message }
}

private func vidkarLookup<Entity>(empty: String, operation: () async throws -> [Entity]) async throws -> [Entity] {
  let results: [Entity]
  do {
    results = try await operation()
    try Task.checkCancellation()
  } catch {
    if error is CancellationError || (error as? URLError)?.code == .cancelled { throw CancellationError() }
    try Task.checkCancellation()
    throw VIDKARLookupError(message: vidkarSiriFailureMessage(for: error))
  }
  guard !results.isEmpty else { throw VIDKARLookupError(message: empty) }
  return results
}

@available(iOS 27.3, *)
extension VIDKARUserSearchAppEntity: @retroactive SnippetRepresentableEntity {
  public static var snippet: some EntitySnippetContent<Self> {
    CardSnippet(supportedFamilies: [.standard]) { user, _ in
      let membership = user.memberSince.map { "Miembro desde \($0.formatted(date: .abbreviated, time: .omitted))" }
      let status = user.isBanned.map { $0 ? "Cuenta bloqueada" : "Cuenta sin bloqueo" }
      let details = [user.role, membership, status].compactMap { $0 }.joined(separator: " · ")
      let row = VIDKARSiriCardRow(title: user.fullName, subtitle: "@\(user.username)", detail: details,
        thumbnail: user.avatarImageData, detailURL: user.profileURL, isAvatar: true)
      let result = VIDKARSiriResult(title: row.title, symbol: "person.crop.circle", rows: [row], emptyMessage: "")
      VIDKARSiriCardView(result: result).privacySensitive()
    }
  }
}

@available(iOS 27.3, *)
struct VIDKARSiriPreviewOpenProfileIntent: OpenIntent {
  static let title: LocalizedStringResource = "Abrir perfil en VIDKAR"
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Perfil") var target: VIDKARUserSearchAppEntity

  func perform() async throws -> some IntentResult {
    guard target.profileURL != nil else {
      throw VIDKARLookupError(message: "El perfil no tiene un enlace disponible.")
    }
    return .result()
  }
}

@available(iOS 27.3, *)
struct VIDKARPreviewCatalogEntity: AppEntity, SnippetRepresentableEntity {
  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Artículo del catálogo VIDKAR")
  static let defaultQuery = VIDKARPreviewCatalogQuery()
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  let id: String
  @Property(title: "Título", description: "Nombre del artículo en el catálogo") var title: String
  @Property(title: "Categoría", description: "Tipo de contenido del catálogo") var category: String
  @Property(title: "Información", description: "Año, género o tienda cuando corresponda") var subtitle: String
  @Property(title: "Descripción", description: "Descripción o sinopsis disponible") var detail: String
  private let thumbnail: Data?
  private let detailURL: URL?
  private let symbol: String
  private let portrait: Bool

  init(item: VIDKARSiriContentCatalog.Item, kind: VIDKARSiriContentKind) {
    id = "\(kind.rawValue):\(item.id)"
    thumbnail = item.imageData
    detailURL = item.detailURL
    symbol = kind.presentation.symbol
    portrait = kind == .series
    // Assign the App Intents property wrappers after all stored constants are initialized.
    title = item.title
    category = kind.presentation.title
    subtitle = item.subtitle
    detail = item.detail
  }

  var displayRepresentation: DisplayRepresentation {
    let context = [subtitle, category].filter { !$0.isEmpty }.joined(separator: " · ")
    let image = thumbnail.map { DisplayRepresentation.Image(data: $0) }
      ?? DisplayRepresentation.Image(systemName: symbol, isTemplate: true)
    return DisplayRepresentation(title: "\(title)", subtitle: "\(context)", image: image)
  }

  static var snippet: some EntitySnippetContent<Self> {
    CardSnippet(supportedFamilies: [.standard]) { entity, _ in
      let row = VIDKARSiriCardRow(title: entity.title, subtitle: entity.subtitle, detail: entity.detail,
        thumbnail: entity.thumbnail, detailURL: entity.detailURL, isPortrait: entity.portrait)
      let result = VIDKARSiriResult(title: row.title, symbol: entity.symbol, rows: [row], emptyMessage: "")
      VIDKARSiriCardView(result: result)
    }
  }
}

@available(iOS 27.3, *)
struct VIDKARPreviewCatalogQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [VIDKARPreviewCatalogEntity] {
    var results: [VIDKARPreviewCatalogEntity] = []
    for identifier in identifiers.prefix(5) {
      let parts = identifier.split(separator: ":", maxSplits: 1).map(String.init)
      guard parts.count == 2 else { continue }
      guard let kind = VIDKARSiriContentKind(rawValue: parts[0]) else { continue }
      let items = try await VIDKARSiriContentCatalog.search(kind.presentation.kind, matching: nil, resultID: parts[1])
      results.append(contentsOf: items.map { VIDKARPreviewCatalogEntity(item: $0, kind: kind) })
    }
    return results
  }

  func suggestedEntities() async throws -> [VIDKARPreviewCatalogEntity] { [] }
}

@available(iOS 27.3, *)
@AppIntent(.tool)
struct VIDKARSiriPreviewProductSearchIntent: AppIntent {
  static let title: LocalizedStringResource = "Explora el catálogo de productos de VIDKAR"
  static let description = IntentDescription("Busca o lista artículos de Comercio. Devuelve una tarjeta por producto con precio, tienda, imagen disponible y acceso a su detalle.")
  static let supportedModes: IntentModes = .background
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Producto", description: "Tipo o modelo breve, como PS5 o USB-C. Omítelo para ver qué hay.")
  var query: String?

  func perform() async throws -> some IntentResult & ReturnsValue<[VIDKARCommerceProductAppEntity]> {
    let products = try await vidkarLookup(empty: "No encontré productos para esta consulta en VIDKAR.") {
      try await VIDKARCommerceProductEntityQuery().search(matching: query)
    }
    return .result(value: products)
  }
}

@available(iOS 27.3, *)
extension VIDKARCommerceProductAppEntity: @retroactive SnippetRepresentableEntity {
  public static var snippet: some EntitySnippetContent<Self> {
    CardSnippet(supportedFamilies: [.standard]) { product, _ in
      let row = VIDKARSiriCardRow(title: product.title, subtitle: product.subtitle, detail: product.summary,
        badge: product.price ?? "", thumbnail: product.thumbnailImageData, detailURL: product.detailURL)
      let result = VIDKARSiriResult(title: row.title, symbol: "shippingbox", rows: [row], emptyMessage: "")
      VIDKARSiriCardView(result: result)
    }
  }
}

@available(iOS 27.3, *)
extension VIDKARMovieAppEntity: @retroactive SnippetRepresentableEntity {
  public static var snippet: some EntitySnippetContent<Self> {
    CardSnippet(supportedFamilies: [.standard]) { movie, _ in
      let row = VIDKARSiriCardRow(title: movie.title, subtitle: movie.subtitle, detail: movie.summary,
        thumbnail: movie.thumbnailImageData, detailURL: movie.detailURL, isPortrait: true)
      let result = VIDKARSiriResult(title: row.title, symbol: "film", rows: [row], emptyMessage: "")
      VIDKARSiriCardView(result: result)
    }
  }
}

@available(iOS 27.3, *)
@AppIntent(.tool)
struct VIDKARSiriPreviewMovieSearchIntent: AppIntent {
  static let title: LocalizedStringResource = "Busca películas en VIDKAR"
  static let description = IntentDescription("Busca películas por título y devuelve la ficha de cada coincidencia con su imagen y descripción disponibles.")
  static let supportedModes: IntentModes = .background
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Título", description: "Nombre de la película o término que indicó la persona.")
  var query: String

  func perform() async throws -> some IntentResult & ReturnsValue<[VIDKARMovieAppEntity]> {
    let movies = try await vidkarLookup(empty: "No encontré películas que coincidan en VIDKAR.") {
      try await VIDKARMovieEntityQuery().entities(matching: query)
    }
    return .result(value: movies)
  }
}

@available(iOS 27.3, *)
enum VIDKARPreviewPlanKind: String, AppEnum {
  case cubacel, proxy, vpn
  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Catálogo de planes")
  static let caseDisplayRepresentations: [Self: DisplayRepresentation] = [
    .cubacel: "Recargas Cubacel", .proxy: "Paquetes Proxy", .vpn: "Paquetes VPN",
  ]

  var title: String {
    switch self {
    case .cubacel: return "Cubacel"
    case .proxy: return "Proxy"
    case .vpn: return "VPN"
    }
  }

  var symbol: String {
    switch self {
    case .cubacel: return "antenna.radiowaves.left.and.right"
    case .proxy: return "globe"
    case .vpn: return "shield.lefthalf.filled"
    }
  }

  var catalogKind: VIDKARPlanCatalog.Kind {
    switch self {
    case .cubacel: return .cubacel
    case .proxy: return .proxy
    case .vpn: return .vpn
    }
  }
}

@available(iOS 27.3, *)
struct VIDKARPreviewPlanEntity: TransientAppEntity, SnippetRepresentableEntity {
  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Oferta de VIDKAR")
  static let defaultQuery = VIDKARPreviewPlanQuery()
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication
  var id = UUID().uuidString
  @Property(title: "Servicio") var kind: VIDKARPreviewPlanKind
  @Property(title: "Identificador de la oferta") var offerID: String
  @Property(title: "Producto") var title: String
  @Property(title: "Detalles de la oferta") var detail: String
  @Property(title: "Importe") var price: Double
  @Property(title: "Moneda") var currency: String

  init() {
    kind = .cubacel
    offerID = ""
    title = ""
    detail = ""
    price = 0
    currency = ""
  }

  init(offer: VIDKARPlanCatalog.Offer, kind: VIDKARPreviewPlanKind) {
    self.init()
    self.kind = kind
    offerID = offer.id
    title = offer.title
    detail = [offer.subtitle, offer.detail].filter { !$0.isEmpty && $0 != offer.title }.joined(separator: " · ")
    price = offer.price
    currency = offer.currency
  }

  private var priceLabel: String { "\(price.formatted(.number.precision(.fractionLength(2)))) \(currency)" }
  private var detailURL: URL? {
    guard kind == .cubacel, offerID.range(of: "^[0-9]{1,18}$", options: .regularExpression) != nil else { return nil }
    return URL(string: "vidkar://cubacel/\(offerID)")
  }

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(title)", subtitle: "\(kind.title) · \(priceLabel)",
      image: .init(systemName: kind.symbol, isTemplate: true))
  }

  static var snippet: some EntitySnippetContent<Self> {
    CardSnippet(supportedFamilies: [.standard]) { offer, _ in
      let row = VIDKARSiriCardRow(title: offer.title, subtitle: offer.kind.title, detail: offer.detail,
        badge: offer.priceLabel, detailURL: offer.detailURL)
      let result = VIDKARSiriResult(title: row.title, symbol: offer.kind.symbol, rows: [row], emptyMessage: "")
      VIDKARSiriCardView(result: result)
    }
  }
}

@available(iOS 27.3, *)
struct VIDKARPreviewPlanQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [VIDKARPreviewPlanEntity] { [] }
  func suggestedEntities() async throws -> [VIDKARPreviewPlanEntity] { [] }
}

@available(iOS 27.3, *)
@AppIntent(.tool)
struct VIDKARSiriPreviewPlanSearchIntent: AppIntent {
  static let title: LocalizedStringResource = "Consulta ofertas Cubacel y paquetes Proxy o VPN"
  static let description = IntentDescription("Lista recargas o promociones Cubacel y paquetes de Proxy o VPN con su precio y condiciones disponibles.")
  static let supportedModes: IntentModes = .background
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Servicio", description: "Elige Cubacel, Proxy o VPN según el catálogo pedido.")
  var kind: VIDKARPreviewPlanKind

  @Parameter(title: "Oferta", description: "Término concreto de la oferta. Omítelo para listar opciones.")
  var query: String?

  func perform() async throws -> some IntentResult & ReturnsValue<[VIDKARPreviewPlanEntity]> {
    let offers = try await vidkarLookup(empty: "No encontré ofertas que coincidan en ese catálogo.") {
      try await VIDKARPlanCatalog.list(kind.catalogKind, matching: query)
    }
    return .result(value: offers.map { VIDKARPreviewPlanEntity(offer: $0, kind: kind) })
  }
}

@available(iOS 27.3, *)
enum VIDKARSiriContentKind: String, AppEnum {
  case series, episode, course, lesson, product
  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Tipo de contenido VIDKAR")
  static let caseDisplayRepresentations: [Self: DisplayRepresentation] = [
    .series: "Series", .episode: "Capítulos", .course: "Cursos",
    .lesson: "Lecciones", .product: "Productos y recargas",
  ]

  var presentation: (kind: VIDKARSiriContentCatalog.Kind, title: String, symbol: String) {
    switch self {
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
  static let title: LocalizedStringResource = "Busca series, cursos y otros contenidos en VIDKAR"
  static let description = IntentDescription("Consulta el catálogo autorizado de series, capítulos, cursos, lecciones y recargas. Devuelve una tarjeta por coincidencia con los datos y la imagen disponibles.")
  static let supportedModes: IntentModes = .background
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Catálogo", description: "Tipo de contenido que la persona quiere consultar.")
  var kind: VIDKARSiriContentKind
  @Parameter(title: "Título o término", description: "Nombre o término breve. Puedes omitirlo para listar cursos.")
  var query: String?

  func perform() async throws -> some IntentResult & ReturnsValue<[VIDKARPreviewCatalogEntity]> {
    let term = query?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    guard !term.isEmpty || kind == .course else {
      throw VIDKARLookupError(message: "¿Qué título o nombre quieres buscar en VIDKAR?")
    }
    let items = try await vidkarLookup(empty: "No encontré coincidencias en este catálogo de VIDKAR.") {
      try await VIDKARSiriContentCatalog.search(kind.presentation.kind, matching: term)
    }
    return .result(value: items.map { VIDKARPreviewCatalogEntity(item: $0, kind: kind) })
  }
}

@available(iOS 27.3, *)
@AppIntent(.tool)
struct VIDKARSiriPreviewUserSearchIntent: AppIntent {
  static let title: LocalizedStringResource = "Busca usuarios y muestra su perfil en VIDKAR"
  static let description = IntentDescription("Busca personas o clientes autorizados por @usuario, nombre o apellido. Muestra la ficha de perfil con foto, rol, alta y estado cuando están disponibles.")
  static let supportedModes: IntentModes = .background
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Usuario", description: "Envía solo el nombre, apellido o @usuario indicado, como «Carlos Medina» o «@carlos». Omítelo solo cuando la persona pide su propio perfil.")
  var query: String?

  func perform() async throws -> some IntentResult & ReturnsValue<[VIDKARUserSearchAppEntity]> {
    let users = try await vidkarLookup(empty: "No encontré ese usuario dentro de tu acceso autorizado.") {
      try await VIDKARSiriUserDirectory.search(query)
    }
    return .result(value: users)
  }
}

@available(iOS 27.3, *)
struct VIDKARPreviewUsageEntity: TransientAppEntity, SnippetRepresentableEntity {
  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Consumo de un servicio VIDKAR")
  static let defaultQuery = VIDKARPreviewUsageQuery()
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication
  var id = UUID().uuidString
  @Property(title: "Servicio") var service: VIDKARAccountService
  @Property(title: "Cuenta") var account: String
  @Property(title: "Bytes usados") var usedBytes: Double?
  @Property(title: "Cuota en MB") var quotaMB: Double?
  @Property(title: "Ilimitado") var unlimited: Bool?
  @Property(title: "Vencimiento") var expiresAt: Date?
  @Property(title: "Resumen de consumo") var summary: String
  private var metric: VIDKARServiceUsageMetric?

  init() {
    service = .proxy
    account = ""
    usedBytes = nil
    quotaMB = nil
    unlimited = nil
    expiresAt = nil
    summary = ""
  }

  init(metric: VIDKARServiceUsageMetric, account: String) {
    self.init()
    self.metric = metric
    self.account = account
    service = metric.serviceKey == "vpn" ? .vpn : .proxy
    usedBytes = metric.usedBytes
    quotaMB = metric.quotaMB
    unlimited = metric.isUnlimited
    expiresAt = metric.expiresAt
    summary = metric.summary
  }

  var displayRepresentation: DisplayRepresentation {
    let title = service == .vpn ? "Consumo VPN" : "Consumo Proxy"
    let detail = [account, summary].filter { !$0.isEmpty }.joined(separator: " · ")
    return DisplayRepresentation(title: "\(title)", subtitle: "\(detail)",
      image: .init(systemName: service == .vpn ? "shield.lefthalf.filled" : "globe", isTemplate: true))
  }

  static var snippet: some EntitySnippetContent<Self> {
    CardSnippet(supportedFamilies: [.standard]) { usage, _ in
      VStack(alignment: .leading, spacing: 4) {
        Text(verbatim: usage.account).font(.caption).foregroundStyle(.secondary)
        if let metric = usage.metric {
          VIDKARServiceUsageChart(metric: metric)
        } else {
          Text(verbatim: usage.summary)
        }
      }
      .padding(12)
      .privacySensitive()
    }
  }
}

@available(iOS 27.3, *)
struct VIDKARPreviewUsageQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [VIDKARPreviewUsageEntity] { [] }
  func suggestedEntities() async throws -> [VIDKARPreviewUsageEntity] { [] }
}

@available(iOS 27.3, *)
@AppIntent(.tool)
struct VIDKARSiriPreviewServiceUsageIntent: AppIntent {
  static let title: LocalizedStringResource = "Consulta consumo de Proxy y VPN en VIDKAR"
  static let description = IntentDescription("Muestra el consumo actual de Proxy o VPN con un gráfico de cuota, saldo disponible, estado y vencimiento para una cuenta autorizada.")
  static let supportedModes: IntentModes = .background
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Usuario", description: "Username o nombre completo. Omítelo solo para consultar el consumo propio.")
  var username: String?
  @Parameter(title: "Servicio", description: "Proxy o VPN. Si la persona pide el consumo general, omite el servicio para ver ambos.")
  var service: VIDKARAccountService?

  func perform() async throws -> some IntentResult & ReturnsValue<[VIDKARPreviewUsageEntity]> {
    let usages = try await vidkarLookup(empty: "No hay datos de consumo disponibles para esa cuenta.") {
      let user = try await VIDKARSiriUserDirectory.account(matching: username)
      let report = try await VIDKARGetUserServiceUsageIntent.read(user: user, service: service)
      return report.usageMetrics.filter { $0.usedBytes != nil }
        .map { VIDKARPreviewUsageEntity(metric: $0, account: report.subtitle) }
    }
    return .result(value: usages)
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
struct VIDKARSiriPreviewActivitySnippet: SnippetIntent {
  static let title: LocalizedStringResource = "Ficha de actividad VIDKAR"
  static let isDiscoverable = false
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Título") var reportTitle: String
  @Parameter(title: "Cuenta y período") var context: String
  @Parameter(title: "Actividad") var reportSummary: String
  @Parameter(title: "Enlace del perfil") var profileURL: URL?

  fileprivate init(card: VIDKARSiriResult) {
    reportTitle = card.title
    context = card.subtitle
    reportSummary = card.summary
    profileURL = card.profileURL
  }

  init() {}

  func perform() async throws -> some IntentResult & ShowsSnippetView {
    let rows = reportSummary.split(separator: "\n").map { VIDKARSiriCardRow(title: String($0)) }
    var result = VIDKARSiriResult(title: reportTitle, subtitle: context, symbol: "list.bullet.rectangle",
      rows: rows, emptyMessage: "VIDKAR no devolvió datos para esta consulta.")
    result.profileURL = profileURL
    return .result(view: VIDKARSiriCardView(result: result).privacySensitive())
  }
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

  func perform() async throws -> some IntentResult & ReturnsValue<VIDKARSiriResult> & ShowsSnippetIntent {
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
      guard let report else { throw VIDKARLookupError(message: "VIDKAR no devolvió el informe solicitado.") }
      var result = VIDKARSiriResult(report: report, symbol: "list.bullet.rectangle")
      let account = user.map { "@\($0.username)" } ?? "Mi cuenta"
      result.compactSubtitle = account
      result.subtitle = [account, report.subtitle].filter { !$0.isEmpty }.joined(separator: "\n")
      result.profileURL = user?.profileURL
      return result
    }
    return .result(value: card, snippetIntent: VIDKARSiriPreviewActivitySnippet(card: card))
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

  func perform() async throws -> some IntentResult & ReturnsValue<VIDKARSiriResult> {
    let card = try await vidkarSiriCard {
      let intent = VIDKARGetMyRecordsIntent()
      intent.records = records
      intent.query = query ?? ""
      intent.period = period
      guard let report = try await intent.perform().value else {
        throw VIDKARLookupError(message: "VIDKAR no devolvió los datos solicitados.")
      }
      return VIDKARSiriResult(report: report, symbol: records == .message ? "bubble.left.and.bubble.right" : "checkmark.seal")
    }
    return .result(value: card)
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

  func perform() async throws -> some IntentResult & ReturnsValue<VIDKARSiriResult> {
    let card = try await vidkarSiriCard {
      let intent = VIDKARGetBusinessReportIntent()
      intent.report = report
      intent.period = period
      guard let value = try await intent.perform().value else {
        throw VIDKARLookupError(message: "VIDKAR no devolvió el informe solicitado.")
      }
      return VIDKARSiriResult(report: value, symbol: "chart.bar")
    }
    return .result(value: card)
  }
}

@available(iOS 27.3, *)
@AppIntent(.tool)
struct VIDKARSiriPreviewCapabilitiesIntent: AppIntent {
  static let title: LocalizedStringResource = "Explora las consultas de VIDKAR"
  static let description = IntentDescription("Enumera las consultas disponibles y el alcance de los datos de VIDKAR.")
  static let supportedModes: IntentModes = .background
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  func perform() async throws -> some IntentResult & ReturnsValue<VIDKARSiriResult> {
    try Task.checkCancellation()
    let rows = [
      VIDKARSiriCardRow(title: "Catálogos", detail: "Comercio, recargas, películas, series, capítulos, cursos y lecciones."),
      VIDKARSiriCardRow(title: "Usuarios y consumo", detail: "Perfiles autorizados y consumo actual de Proxy y VPN."),
      VIDKARSiriCardRow(title: "Actividad de cuenta", detail: "Compras, órdenes, ventas asociadas, mensajes propios y suscripciones."),
      VIDKARSiriCardRow(title: "Negocio", detail: "Ventas, pagos, costos registrados y rentabilidad según tus permisos."),
    ]
    let card = VIDKARSiriResult(title: "Qué puedes consultar", symbol: "list.bullet", rows: rows, emptyMessage: "")
    return .result(value: card)
  }
}
#endif
