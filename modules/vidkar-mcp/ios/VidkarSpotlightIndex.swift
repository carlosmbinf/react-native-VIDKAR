import AppIntents
import CoreSpotlight
import Foundation

// Spotlight aporta descubrimiento semántico de contenido público; no es un
// App Schema ni autoriza la indexación de datos de cuenta.
@available(iOS 18.0, *)
extension VIDKARSearchResultEntity: IndexedEntity {
  var attributeSet: CSSearchableItemAttributeSet {
    let attributes = CSSearchableItemAttributeSet(contentType: .content)
    attributes.title = title
    attributes.contentDescription = summary.isEmpty ? subtitle : summary
    attributes.keywords = [title, subtitle, entityType.rawValue, "VIDKAR"]
      .filter { !$0.isEmpty }
    attributes.contentURL = URL(string: deepLink)
    return attributes
  }
}

@available(iOS 18.0, *)
enum VIDKARSpotlightIndex {
  private static let indexName = "com.vidkar.app.content"
  private static let publicTypes: Set<String> = [
    "movie",
    "series",
    "episode",
    "course",
    "product",
  ]

  static func index(_ payloads: [MCPSearchEntityPayload]) async {
    let entities = payloads
      .filter { publicTypes.contains($0.type) }
      .compactMap(VIDKARSearchResultEntity.init(payload:))

    guard !entities.isEmpty else { return }

    do {
      try await CSSearchableIndex(name: indexName)
        .indexAppEntities(entities, priority: 1)
    } catch {
      // Fallar Spotlight nunca debe romper una búsqueda MCP.
    }
  }
}