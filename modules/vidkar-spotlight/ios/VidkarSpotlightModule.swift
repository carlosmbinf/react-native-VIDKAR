import CoreSpotlight
import ExpoModulesCore
import UniformTypeIdentifiers

public final class VidkarSpotlightModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VidkarSpotlight")
    Events("onSpotlightItemTapped")

    OnStartObserving {
      VidkarSpotlightSelectionCenter.shared.setListener { [weak self] identifier in
        self?.sendEvent("onSpotlightItemTapped", ["id": identifier])
      }
    }

    OnStopObserving {
      VidkarSpotlightSelectionCenter.shared.setListener(nil)
    }

    AsyncFunction("replaceDomainItems") {
      (domainIdentifier: String, rawItems: [[String: Any]], promise: Promise) in
      let searchableItems = rawItems.compactMap {
        self.makeSearchableItem(from: $0, domainIdentifier: domainIdentifier)
      }
      let searchableIndex = CSSearchableIndex.default()

      searchableIndex.deleteSearchableItems(
        withDomainIdentifiers: [domainIdentifier]
      ) { deleteError in
        if let deleteError {
          promise.reject("spotlight_delete_failed", deleteError.localizedDescription)
          return
        }

        guard !searchableItems.isEmpty else {
          promise.resolve(nil)
          return
        }

        searchableIndex.indexSearchableItems(searchableItems) { indexError in
          if let indexError {
            promise.reject("spotlight_index_failed", indexError.localizedDescription)
            return
          }

          promise.resolve(nil)
        }
      }
    }
  }

  private func makeSearchableItem(
    from rawItem: [String: Any],
    domainIdentifier: String
  ) -> CSSearchableItem? {
    guard
      let identifier = rawItem["id"] as? String,
      !identifier.isEmpty,
      let title = rawItem["title"] as? String,
      !title.isEmpty
    else {
      return nil
    }

    let attributes = CSSearchableItemAttributeSet(
      itemContentType: UTType.content.identifier
    )
    attributes.title = title
    attributes.contentDescription = rawItem["description"] as? String

    if let thumbnailURLString = rawItem["thumbnailURL"] as? String,
       let thumbnailURL = URL(string: thumbnailURLString) {
      attributes.thumbnailURL = thumbnailURL
    }

    if let metadata = rawItem["metadata"] as? [String: Any] {
      attributes.keywords = metadata["keywords"] as? [String]
      attributes.contentType = metadata["contentType"] as? String
      attributes.rankingHint = metadata["rankingHint"] as? NSNumber
    }

    return CSSearchableItem(
      uniqueIdentifier: identifier,
      domainIdentifier: domainIdentifier,
      attributeSet: attributes
    )
  }
}