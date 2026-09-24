import AppIntents
import CoreSpotlight
import Foundation

// MARK: - Spotlight entity indexing
//
// Public catalog entities can be indexed and resolved by Spotlight. Private
// account data remains available only through confirmed App Intents.

@available(iOS 18.0, *)
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
@available(iOS 18.0, *)
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
