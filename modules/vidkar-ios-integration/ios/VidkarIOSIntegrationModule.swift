import AppIntents
import CoreSpotlight
import ExpoModulesCore
import Foundation
import UniformTypeIdentifiers
import UIKit

private enum VidkarSpotlightError: Error {
  case invalidItem
  case indexingFailed(Error)
}

private struct VidkarSpotlightItem {
  let uniqueIdentifier: String
  let title: String
  let description: String
  let keywords: [String]
  let contentURL: URL?
  let thumbnailURL: URL?
  let domainIdentifier: String
}

private func stringValue(_ value: Any?) -> String? {
  guard let value else { return nil }
  let string = String(describing: value).trimmingCharacters(in: .whitespacesAndNewlines)
  return string.isEmpty ? nil : string
}

private func stringArrayValue(_ value: Any?) -> [String] {
  if let values = value as? [String] {
    return values.compactMap { stringValue($0) }
  }

  if let values = value as? [Any] {
    return values.compactMap { stringValue($0) }
  }

  return []
}

private func urlValue(_ value: Any?) -> URL? {
  guard let string = stringValue(value),
        let url = URL(string: string),
        let scheme = url.scheme?.lowercased(),
        ["http", "https", "vidkar"].contains(scheme) else {
    return nil
  }

  return url
}

private func parseSpotlightItem(_ payload: [String: Any], domainIdentifier: String) throws -> VidkarSpotlightItem {
  guard let identifier = stringValue(payload["id"]),
        let title = stringValue(payload["title"]) else {
    throw VidkarSpotlightError.invalidItem
  }

  let safeDomain = stringValue(payload["domainIdentifier"]) ?? domainIdentifier
  let safeIdentifier = "com.vidkar.spotlight.\(safeDomain).\(identifier)"

  return VidkarSpotlightItem(
    uniqueIdentifier: safeIdentifier,
    title: title,
    description: String(stringValue(payload["description"])?.prefix(500) ?? ""),
    keywords: Array(stringArrayValue(payload["keywords"]).prefix(30)),
    contentURL: urlValue(payload["contentURL"]),
    thumbnailURL: urlValue(payload["thumbnailURL"]),
    domainIdentifier: safeDomain
  )
}

private func searchableItem(from item: VidkarSpotlightItem) -> CSSearchableItem {
  let attributes = CSSearchableItemAttributeSet(itemContentType: UTType.item.identifier)
  attributes.title = item.title
  attributes.contentDescription = item.description
  attributes.keywords = item.keywords
  attributes.domainIdentifier = item.domainIdentifier
  attributes.contentURL = item.contentURL
  attributes.thumbnailURL = item.thumbnailURL

  return CSSearchableItem(
    uniqueIdentifier: item.uniqueIdentifier,
    domainIdentifier: item.domainIdentifier,
    attributeSet: attributes
  )
}

@available(iOS 16.0, *)
private enum VidkarAppIntentSupport {
  static func open(_ urlString: String) async {
    guard let url = URL(string: urlString) else { return }

    await MainActor.run {
      UIApplication.shared.open(url, options: [:], completionHandler: nil)
    }
  }
}

@available(iOS 16.0, *)
struct VidkarContinueWatchingIntent: AppIntent {
  static var title: LocalizedStringResource = "Continuar viendo en VIDKAR"
  static var description = IntentDescription("Abre VIDKAR para continuar con tu contenido.")
  static var openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    await VidkarAppIntentSupport.open("vidkar://continuar")
    return .result()
  }
}

@available(iOS 16.0, *)
struct VidkarOpenCoursesIntent: AppIntent {
  static var title: LocalizedStringResource = "Abrir cursos de VIDKAR"
  static var description = IntentDescription("Abre el catálogo de cursos de VIDKAR.")
  static var openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    await VidkarAppIntentSupport.open("vidkar://cursos")
    return .result()
  }
}

@available(iOS 16.0, *)
struct VidkarOpenMoviesIntent: AppIntent {
  static var title: LocalizedStringResource = "Abrir películas de VIDKAR"
  static var description = IntentDescription("Abre el catálogo de películas de VIDKAR.")
  static var openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    await VidkarAppIntentSupport.open("vidkar://peliculas")
    return .result()
  }
}

@available(iOS 16.0, *)
struct VidkarAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: VidkarContinueWatchingIntent(),
      phrases: [
        "Continúa viendo en \(.applicationName)",
        "Abre mi contenido en \(.applicationName)"
      ],
      shortTitle: "Continuar viendo",
      systemImageName: "play.fill"
    )
    AppShortcut(
      intent: VidkarOpenCoursesIntent(),
      phrases: [
        "Abre mis cursos en \(.applicationName)",
        "Ver cursos en \(.applicationName)"
      ],
      shortTitle: "Mis cursos",
      systemImageName: "book.fill"
    )
    AppShortcut(
      intent: VidkarOpenMoviesIntent(),
      phrases: [
        "Abre mis películas en \(.applicationName)",
        "Ver películas en \(.applicationName)"
      ],
      shortTitle: "Mis películas",
      systemImageName: "film.fill"
    )
  }
}

public final class VidkarIOSIntegrationModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VidkarIOSIntegration")

    Function("isSpotlightAvailable") { () -> Bool in
      true
    }

    AsyncFunction("replaceSpotlightItems") { (domainIdentifier: String, payloads: [[String: Any]], promise: Promise) in
      let domain = domainIdentifier.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !domain.isEmpty else {
        promise.reject("invalid_domain", "El dominio de Spotlight no puede estar vacío.")
        return
      }

      do {
        let items = try payloads.compactMap { payload in
          try searchableItem(from: parseSpotlightItem(payload, domainIdentifier: domain))
        }
        let index = CSSearchableIndex.default()

        index.deleteSearchableItems(withDomainIdentifiers: [domain]) { deleteError in
          if let deleteError {
            promise.reject("spotlight_delete_failed", deleteError.localizedDescription)
            return
          }

          guard !items.isEmpty else {
            promise.resolve(["indexed": 0, "domainIdentifier": domain])
            return
          }

          index.indexSearchableItems(items) { indexError in
            if let indexError {
              promise.reject("spotlight_index_failed", indexError.localizedDescription)
              return
            }

            promise.resolve(["indexed": items.count, "domainIdentifier": domain])
          }
        }
      } catch VidkarSpotlightError.invalidItem {
        promise.reject("invalid_item", "Un elemento de Spotlight no tiene un id o título válido.")
      } catch {
        promise.reject("spotlight_invalid_payload", error.localizedDescription)
      }
    }

    AsyncFunction("indexSpotlightItems") { (domainIdentifier: String, payloads: [[String: Any]], promise: Promise) in
      let domain = domainIdentifier.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !domain.isEmpty else {
        promise.reject("invalid_domain", "El dominio de Spotlight no puede estar vacío.")
        return
      }

      do {
        let items = try payloads.compactMap { payload in
          try searchableItem(from: parseSpotlightItem(payload, domainIdentifier: domain))
        }

        guard !items.isEmpty else {
          promise.resolve(["indexed": 0, "domainIdentifier": domain])
          return
        }

        CSSearchableIndex.default().indexSearchableItems(items) { error in
          if let error {
            promise.reject("spotlight_index_failed", error.localizedDescription)
            return
          }

          promise.resolve(["indexed": items.count, "domainIdentifier": domain])
        }
      } catch VidkarSpotlightError.invalidItem {
        promise.reject("invalid_item", "Un elemento de Spotlight no tiene un id o título válido.")
      } catch {
        promise.reject("spotlight_invalid_payload", error.localizedDescription)
      }
    }

    AsyncFunction("clearSpotlightDomain") { (domainIdentifier: String, promise: Promise) in
      let domain = domainIdentifier.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !domain.isEmpty else {
        promise.reject("invalid_domain", "El dominio de Spotlight no puede estar vacío.")
        return
      }

      CSSearchableIndex.default().deleteSearchableItems(withDomainIdentifiers: [domain]) { error in
        if let error {
          promise.reject("spotlight_delete_failed", error.localizedDescription)
          return
        }

        promise.resolve(["cleared": true, "domainIdentifier": domain])
      }
    }
  }
}
