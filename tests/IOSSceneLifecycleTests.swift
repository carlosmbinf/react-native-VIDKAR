// Harness standalone: UIKit/factory aislados, subscriber/registry de Expo instalados.
// Ninguna app, red, dispositivo ni dato real. El stdout contiene solo fixtures.
import Foundation
import UIKit
import React
internal import Expo

@main
struct IOSSceneLifecycleTests {
  @MainActor
  static func main() throws {
    var snapshots: [[String: Any]] = []
    let search = URL(string: "vidkar://search?q=C%2B%2B%20%26%20Swift&entity=all")!
    let universal = URL(string: "https://www.vidkar.com/search?q=C%2B%2B%20%26%20Swift&entity=all")!
    let customKey = UIApplication.LaunchOptionsKey(rawValue: "fixture-unrelated-launch-option")
    func activity(_ type: String, _ url: URL? = nil) -> NSUserActivity {
      let result = NSUserActivity(activityType: type)
      result.webpageURL = url
      return result
    }
    // Esquema exacto de RCTLinkingManager.mm (verificado también por el test JS).
    func rctURL(_ options: [UIApplication.LaunchOptionsKey: Any]?) -> URL? {
      if let url = options?[.url] as? URL { return url }
      guard let dictionary = options?[.userActivityDictionary] as? [String: Any],
        dictionary["UIApplicationLaunchOptionsUserActivityTypeKey"] as? String == NSUserActivityTypeBrowsingWeb,
        let value = dictionary["UIApplicationLaunchOptionsUserActivityKey"] as? NSUserActivity else { return nil }
      return value.webpageURL
    }
    for name in ["normal", "search", "universal", "legacy-url", "legacy-universal", "non-web", "web-without-url", "mixed", "multiple", "push", "scene-push", "invalid-search", "scene-overrides-legacy"] {
      sceneTestResetURL()
      RCTReactNativeFactory.starts = 0
      RCTReactNativeFactory.options = nil
      let app = AppDelegate()
      UIApplication.shared.delegate = app
      let options = UIScene.ConnectionOptions()
      let web = activity(NSUserActivityTypeBrowsingWeb, universal)
      var original: [UIApplication.LaunchOptionsKey: Any]? = nil
      var expected: URL? = nil
      switch name {
      case "search", "mixed", "multiple":
        let context = UIOpenURLContext(search)
        context.options.sourceApplication = "fixture.source"
        context.options.annotation = "fixture.annotation"
        context.options.openInPlace = true
        options.urlContexts.insert(context)
        expected = search
        if name == "mixed" {
          options.userActivities = [web, activity("fixture.spotlight", URL(string: "https://ignored.example"))]
        }
        if name == "multiple" { options.urlContexts.insert(UIOpenURLContext(URL(string: "vidkar://zz-fixture")!)) }
      case "universal", "scene-overrides-legacy":
        options.userActivities = [web, activity("fixture.spotlight", universal), activity(NSUserActivityTypeBrowsingWeb)]
        expected = universal
        if name == "scene-overrides-legacy" { original = [.url: search, customKey: "preserved"] }
      case "legacy-url": original = [.url: search]; expected = search
      case "legacy-universal":
        original = [.userActivityDictionary: ["UIApplicationLaunchOptionsUserActivityTypeKey": NSUserActivityTypeBrowsingWeb, "UIApplicationLaunchOptionsUserActivityKey": web]]
        expected = universal
      case "non-web": options.userActivities = [activity("fixture.spotlight", universal)]
      case "web-without-url": options.userActivities = [activity(NSUserActivityTypeBrowsingWeb)]
      case "push":
        original = [.remoteNotification: ["fixture": "original-push"], customKey: "preserved"]
        options.notificationResponse = TestNotificationResponse(userInfo: ["fixture": "scene-push"])
        options.urlContexts = [UIOpenURLContext(search)]
        expected = search
      case "scene-push": options.notificationResponse = TestNotificationResponse(userInfo: ["fixture": "scene-push"])
      case "invalid-search":
        expected = URL(string: "vidkar://search?q=fixture&confirmed=true")!
        options.urlContexts = [UIOpenURLContext(expected!)]
      default: break
      }
      _ = app.application(UIApplication.shared, didFinishLaunchingWithOptions: original)
      precondition(app.launches == 1 && RCTReactNativeFactory.starts == 0, "didFinishLaunching no arranca JS")
      let delegate = SceneDelegate()
      // Una escena no-window no debe consumir las opciones antes de que pueda arrancar.
      delegate.scene(UIScene(), willConnectTo: UISceneSession(), options: options)
      precondition(RCTReactNativeFactory.starts == 0)
      if original != nil { precondition(app.vidkarSceneLaunchOptions != nil) }
      var receivedAfterBootstrap = 0
      var observer: NSObjectProtocol?
      RCTReactNativeFactory.onStart = {
        precondition(sceneTestInitialURL() == expected, "Expo URL debe existir ANTES del bootstrap: \(name)")
        precondition(rctURL(RCTReactNativeFactory.options) == expected, "RCT URL debe coincidir: \(name)")
        observer = NotificationCenter.default.addObserver(forName: onURLReceivedNotification, object: nil, queue: nil) { _ in
          receivedAfterBootstrap += 1
        }
      }
      let scene = UIWindowScene()
      delegate.scene(scene, willConnectTo: UISceneSession(), options: options)
      precondition(RCTReactNativeFactory.starts == 1 && app.launches == 1)
      precondition(app.vidkarSceneLaunchOptions == nil, "Opciones consumidas, no retenidas para replay")
      precondition(receivedAfterBootstrap == 0, "No reenviar el enlace frío como evento caliente")
      if name == "normal" { precondition(RCTReactNativeFactory.options == nil) }
      if ["search", "mixed", "multiple"].contains(name) {
        precondition(app.openedOptions[.sourceApplication] as? String == "fixture.source")
        precondition(app.openedOptions[.annotation] as? String == "fixture.annotation")
        precondition(app.openedOptions[.openInPlace] as? Bool == true)
      }
      if ["non-web", "mixed", "universal", "scene-overrides-legacy"].contains(name) {
        precondition(app.continuedTypes.filter { $0 == "fixture.spotlight" }.count == 1)
      }
      if name == "push" {
        precondition((RCTReactNativeFactory.options?[.remoteNotification] as? [String: String])?["fixture"] == "original-push")
        precondition(RCTReactNativeFactory.options?[customKey] as? String == "preserved")
        precondition((app.receivedLaunchOptions?[.remoteNotification] as? [String: String])?["fixture"] == "original-push")
      }
      if name == "scene-push" {
        precondition((RCTReactNativeFactory.options?[.remoteNotification] as? [String: String])?["fixture"] == "scene-push")
      }
      snapshots.append(["name": name, "expoURL": sceneTestInitialURL()?.absoluteString as Any? ?? NSNull(), "rctURL": rctURL(RCTReactNativeFactory.options)?.absoluteString as Any? ?? NSNull()])
      // Warm: cada callback continúa entregando un solo evento, sin reiniciar React.
      delegate.scene(scene, openURLContexts: [UIOpenURLContext(search)])
      precondition(receivedAfterBootstrap == 1)
      delegate.scene(scene, continue: web)
      precondition(receivedAfterBootstrap == 2 && RCTReactNativeFactory.starts == 1)
      if let observer { NotificationCenter.default.removeObserver(observer) }
      RCTReactNativeFactory.onStart = nil
    }
    let data = try JSONSerialization.data(withJSONObject: snapshots, options: [.sortedKeys])
    print(String(decoding: data, as: UTF8.self))
  }
}