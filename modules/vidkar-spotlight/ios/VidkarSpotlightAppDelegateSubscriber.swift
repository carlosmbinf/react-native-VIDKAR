import CoreSpotlight
import ExpoModulesCore
import UIKit

public final class VidkarSpotlightAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    guard
      userActivity.activityType == CSSearchableItemActionType,
      let identifier = userActivity.userInfo?[CSSearchableItemActivityIdentifier] as? String
    else {
      return false
    }

    VidkarSpotlightSelectionCenter.shared.handleSelection(identifier)
    return true
  }
}