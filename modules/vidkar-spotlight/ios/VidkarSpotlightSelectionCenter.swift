import Foundation

final class VidkarSpotlightSelectionCenter {
  static let shared = VidkarSpotlightSelectionCenter()

  private var listener: ((String) -> Void)?
  private var pendingIdentifier: String?

  private init() {}

  func setListener(_ listener: ((String) -> Void)?) {
    self.listener = listener

    guard let listener, let pendingIdentifier else {
      return
    }

    self.pendingIdentifier = nil
    listener(pendingIdentifier)
  }

  func handleSelection(_ identifier: String) {
    if let listener {
      listener(identifier)
      return
    }

    pendingIdentifier = identifier
  }
}