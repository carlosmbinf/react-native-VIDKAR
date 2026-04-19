import ExpoModulesCore
import UIKit

public final class CadeteBackgroundTrackingAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func subscriberDidRegister() {
    CadeteNativeLocationService.shared.restoreTrackingIfNeeded()
  }

  public func applicationDidBecomeActive(_ application: UIApplication) {
    CadeteNativeLocationService.shared.restoreTrackingIfNeeded()
  }
}
