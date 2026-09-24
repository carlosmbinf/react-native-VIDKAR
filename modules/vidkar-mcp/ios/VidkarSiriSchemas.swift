import AppIntents
import CoreSpotlight
import Foundation
import UIKit

// MARK: - Apple Intelligence / Siri AI integration
//
// These types are intentionally additive. The existing AppIntents and
// AppShortcuts continue to support iOS 16+ and Shortcuts.
//
// iOS 27+ Siri AI uses the explicit open schema and Spotlight's semantic index
// to resolve VIDKAR content. Informational search is handled by the regular
// AppIntent in VidkarMCPModule.swift.
//
// La búsqueda informativa se expone mediante VIDKARSearchContentIntent en
// VidkarMCPModule.swift. No se registra el schema system.searchInApp porque
// ShowInAppSearchResultsIntent está orientado a abrir la interfaz de búsqueda,
// no a devolver resultados estructurados sin navegación.

@available(iOS 27.0, *)
@AppIntent(schema: .system.open)
struct VIDKARSiriOpenIntent: OpenIntent {
  static var title: LocalizedStringResource = "Abrir contenido de VIDKAR"
  static var description = IntentDescription(
    "Abre un contenido específico de VIDKAR."
  )

  @Parameter(title: "Contenido")
  var target: VIDKARSearchResultEntity

  func perform() async throws -> some IntentResult {
    guard let url = VIDKARSiriURL.deepLink(target.deepLink) else {
      throw NSError(
        domain: "VIDKARSiri",
        code: 2,
        userInfo: [NSLocalizedDescriptionKey: "El enlace del contenido de VIDKAR no es válido."]
      )
    }

    await MainActor.run {
      UIApplication.shared.open(url)
    }

    return .result()
  }
}

// MARK: - Spotlight / semantic indexing

@available(iOS 27.0, *)
extension VIDKARSearchResultEntity: IndexedEntity {
  var attributeSet: CSSearchableItemAttributeSet {
    let attributes = CSSearchableItemAttributeSet(contentType: .content)
    attributes.title = title
    attributes.contentDescription = summary.isEmpty ? subtitle : summary
    attributes.keywords = [
      title,
      subtitle,
      entityType.rawValue,
      "VIDKAR"
    ].filter { !$0.isEmpty }
    attributes.contentURL = URL(string: deepLink)
    return attributes
  }
}

// Only public/catalog content is indexed. Private account data must never
// become available to Spotlight or Apple Intelligence.
@available(iOS 27.0, *)
enum VIDKARSpotlightIndex {
  private static let indexName = "com.vidkar.app.content"

  static func index(_ payloads: [MCPSearchEntityPayload]) async {
    let publicTypes: Set<String> = [
      "movie",
      "series",
      "episode",
      "course",
      "product"
    ]

    let entities = payloads
      .filter { publicTypes.contains($0.type) }
      .compactMap(VIDKARSearchResultEntity.init(payload:))

    guard !entities.isEmpty else { return }

    do {
      try await CSSearchableIndex(name: indexName)
        .indexAppEntities(entities, priority: 1)
    } catch {
      // Spotlight indexing must never break MCP searches or Siri actions.
    }
  }
}

private enum VIDKARSiriURL {
  static func deepLink(_ rawValue: String) -> URL? {
    guard let url = URL(string: rawValue),
          url.scheme?.lowercased() == "vidkar" else {
      return nil
    }

    return url
  }
}
