import AppIntents
import Foundation
import Security

struct VIDKARCurrentUserRecord: Codable, Sendable {
  let id: String
  let fullName: String
  let username: String
}

enum VIDKARCurrentUserStore {
  private static let service = "com.vidkar.app-intents.current-user"
  private static let account = "active-user"

  static func save(id: String, fullName: String, username: String) throws {
    let normalizedID = id.trimmingCharacters(in: .whitespacesAndNewlines)
    let normalizedUsername = username.trimmingCharacters(in: .whitespacesAndNewlines)
    let normalizedName = fullName.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !normalizedID.isEmpty, !normalizedUsername.isEmpty else {
      clear()
      return
    }

    let record = VIDKARCurrentUserRecord(
      id: normalizedID,
      fullName: normalizedName.isEmpty ? normalizedUsername : normalizedName,
      username: normalizedUsername
    )
    let data = try JSONEncoder().encode(record)
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
    ]
    let attributes: [String: Any] = [
      kSecValueData as String: data,
      kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
    ]

    let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
    if updateStatus == errSecItemNotFound {
      var item = query
      attributes.forEach { item[$0.key] = $0.value }
      let addStatus = SecItemAdd(item as CFDictionary, nil)
      guard addStatus == errSecSuccess else {
        throw VIDKARCurrentUserIntentError.keychain(addStatus)
      }
    } else if updateStatus != errSecSuccess {
      throw VIDKARCurrentUserIntentError.keychain(updateStatus)
    }
  }

  static func load() -> VIDKARCurrentUserRecord? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var result: AnyObject?
    guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
          let data = result as? Data else { return nil }
    return try? JSONDecoder().decode(VIDKARCurrentUserRecord.self, from: data)
  }

  static func clear() {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
    ]
    SecItemDelete(query as CFDictionary)
  }
}

private enum VIDKARCurrentUserIntentError: LocalizedError {
  case noActiveUser
  case keychain(OSStatus)

  var errorDescription: String? {
    switch self {
    case .noActiveUser:
      return "Inicia sesión en VIDKAR y vuelve a intentarlo."
    case .keychain:
      return "No se pudo leer de forma segura la sesión de VIDKAR. Abre la app y vuelve a intentarlo."
    }
  }
}

@available(iOS 16.0, *)
struct VIDKARCurrentUserEntity: AppEntity, Sendable {
  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Usuario de VIDKAR")
  static let defaultQuery = VIDKARCurrentUserEntityQuery()

  let id: String
  @Property(title: "Nombre") var fullName: String
  @Property(title: "Username") var username: String

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(
      title: "\(fullName)",
      subtitle: "@\(username)",
      image: DisplayRepresentation.Image(systemName: "person.crop.circle", isTemplate: true)
    )
  }

  init(id: String, fullName: String, username: String) {
    self.id = id
    self.fullName = fullName
    self.username = username
  }

  fileprivate init(record: VIDKARCurrentUserRecord) {
    self.init(id: record.id, fullName: record.fullName, username: record.username)
  }
}

@available(iOS 16.0, *)
struct VIDKARCurrentUserEntityQuery: EntityQuery {
  func entities(for identifiers: [VIDKARCurrentUserEntity.ID]) async throws -> [VIDKARCurrentUserEntity] {
    guard let record = VIDKARCurrentUserStore.load(), identifiers.contains(record.id) else {
      return []
    }
    return [VIDKARCurrentUserEntity(record: record)]
  }

  func suggestedEntities() async throws -> [VIDKARCurrentUserEntity] {
    // A personal account identity is never offered as a silent suggestion.
    return []
  }
}

@available(iOS 16.0, *)
struct VIDKARCurrentUserIntent: AppIntent {
  static let title: LocalizedStringResource = "Dime mi usuario de VIDKAR"
  static let description = IntentDescription("Dice el nombre de la cuenta de VIDKAR autenticada en este dispositivo.")
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication
  static let openAppWhenRun = false

  func perform() async throws -> some IntentResult & ReturnsValue<VIDKARCurrentUserEntity> {
    guard let record = VIDKARCurrentUserStore.load() else {
      throw VIDKARCurrentUserIntentError.noActiveUser
    }

    let entity = VIDKARCurrentUserEntity(record: record)
    let dialog = IntentDialog(stringLiteral: "El usuario de VIDKAR es \(entity.fullName).")
    return .result(value: entity, dialog: dialog)
  }
}

@available(iOS 16.0, *)
struct VIDKARCurrentUserShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    return [
      AppShortcut(
        intent: VIDKARCurrentUserIntent(),
        phrases: [
          "Dime el usuario de \(.applicationName)",
          "Dime cuál es mi usuario en \(.applicationName)",
          "Cuál es el nombre de mi usuario en \(.applicationName)",
        ],
        shortTitle: "Mi usuario",
        systemImageName: "person.crop.circle"
      ),
    ]
  }
}
