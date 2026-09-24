import AppIntents
import CoreSpotlight
import Foundation
import UIKit

// MARK: - Apple Intelligence / Siri AI integration
//
// These types are intentionally additive. The existing AppIntents and
// AppShortcuts continue to support iOS 16+ and Shortcuts.
//
// iOS 27+ Spotlight semantic indexing helps Siri AI resolve VIDKAR content.
// Opening remains handled by the iOS 16-compatible VIDKAROpenEntityIntent.
//
// La búsqueda informativa se expone mediante VIDKARSearchContentIntent en
// VidkarMCPModule.swift. No se registra el schema system.searchInApp porque
// ShowInAppSearchResultsIntent está orientado a abrir la interfaz de búsqueda,
// no a devolver resultados estructurados sin navegación.

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
