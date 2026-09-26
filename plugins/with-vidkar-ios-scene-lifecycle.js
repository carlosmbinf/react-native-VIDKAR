const fs = require("fs");
const path = require("path");
const {
  createRunOncePlugin,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
} = require("@expo/config-plugins");

const pkg = {
  name: "with-vidkar-ios-scene-lifecycle",
  version: "1.1.0",
};

const sceneDelegateSource = `internal import Expo
import React
import UIKit
import UserNotifications

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard
      let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else {
      return
    }

    // Consumir una sola vez las opciones originales (push, background, etc.).
    var launchOptions = appDelegate.vidkarSceneLaunchOptions ?? [:]
    appDelegate.vidkarSceneLaunchOptions = nil
    if launchOptions[.remoteNotification] == nil,
      let response = connectionOptions.notificationResponse {
      launchOptions[.remoteNotification] = response.notification.request.content.userInfo
    }

    // Expo/RCT tienen una única URL inicial. Mismo destino determinista para ambos;
    // URL explícita tiene precedencia sobre BrowsingWeb, igual que RCTLinkingManager.
    let context = connectionOptions.urlContexts.sorted { $0.url.absoluteString < $1.url.absoluteString }.first
    let webActivity = connectionOptions.userActivities.filter {
      $0.activityType == NSUserActivityTypeBrowsingWeb && $0.webpageURL != nil
    }.sorted { $0.webpageURL!.absoluteString < $1.webpageURL!.absoluteString }.first

    var openOptions: [UIApplication.OpenURLOptionsKey: Any] = [:]
    if let context {
      launchOptions[.url] = context.url
      launchOptions[.sourceApplication] = context.options.sourceApplication
      launchOptions[.annotation] = context.options.annotation
      openOptions[.openInPlace] = context.options.openInPlace
    } else if let webActivity {
      launchOptions.removeValue(forKey: .url)
      launchOptions.removeValue(forKey: .sourceApplication)
      launchOptions.removeValue(forKey: .annotation)
      launchOptions[.userActivityDictionary] = [
        UIApplication.LaunchOptionsKey.userActivityType.rawValue: webActivity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": webActivity,
      ]
    }

    // No convertir actividades Spotlight/Handoff en enlaces web; sus suscriptores
    // existentes siguen recibiéndolas, incluso si no hay URL de navegación.
    for activity in connectionOptions.userActivities where activity.activityType != NSUserActivityTypeBrowsingWeb {
      _ = appDelegate.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
    }

    // Antes de crear JS: ExpoAppDelegate -> LinkingAppDelegateSubscriber conserva
    // initialURL para Expo Router/getLinkingURL. Solo launchOptions no basta.
    // No repetir didFinishLaunching ni reenviar estos eventos después del bootstrap.
    if let url = launchOptions[.url] as? URL {
      openOptions[.sourceApplication] = launchOptions[.sourceApplication]
      openOptions[.annotation] = launchOptions[.annotation]
      _ = appDelegate.application(UIApplication.shared, open: url, options: openOptions)
    } else if let activities = launchOptions[.userActivityDictionary] as? [String: Any],
      let activity = activities["UIApplicationLaunchOptionsUserActivityKey"] as? NSUserActivity,
      activity.activityType == NSUserActivityTypeBrowsingWeb, activity.webpageURL != nil {
      _ = appDelegate.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions.isEmpty ? nil : launchOptions
    )
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    for context in URLContexts {
      _ = appDelegate.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    _ = appDelegate.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }
}
`;

const withSceneManifest = (config) => withInfoPlist(config, (config) => {
  const manifest = config.modResults.UIApplicationSceneManifest || {};
  manifest.UISceneConfigurations = {
    ...(manifest.UISceneConfigurations || {}),
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: "Default Configuration",
        UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
      },
    ],
  };
  config.modResults.UIApplicationSceneManifest = manifest;
  return config;
});

const withSceneDelegateFile = (config) => withDangerousMod(config, ["ios", (config) => {
  const filePath = path.join(config.modRequest.platformProjectRoot, "Vidkar", "SceneDelegate.swift");
  const appDelegatePath = path.join(config.modRequest.platformProjectRoot, "Vidkar", "AppDelegate.swift");
  if (!fs.existsSync(appDelegatePath)) {
    throw new Error("No se encontró Vidkar/AppDelegate.swift para conservar las opciones de lanzamiento.");
  }
  const source = fs.readFileSync(appDelegatePath, "utf8");
  // Solo quitar el bootstrap conocido del template Expo; nunca otro #if (orientación, etc.).
  let nextSource = source.replace(
    /\n#if os\(iOS\) \|\| os\(tvOS\)\s+window = UIWindow\(frame: UIScreen\.main\.bounds\)\s+factory\.startReactNative\(\s*withModuleName: "main",\s*in: window,\s*launchOptions: launchOptions\s*\)\s*#endif\r?\n/,
    "\n",
  );
  if (/\bstartReactNative\s*\(/.test(nextSource)) {
    throw new Error("Bootstrap AppDelegate no reconocido; no se genera un segundo arranque de React Native.");
  }
  if (!nextSource.includes("// VIDKAR_SCENE_LAUNCH_OPTIONS")) {
    const classPattern = /class AppDelegate: ExpoAppDelegate \{/;
    const launchPattern = /(didFinishLaunchingWithOptions launchOptions: \[UIApplication\.LaunchOptionsKey: Any\]\?\s*(?:= nil\s*)?\) -> Bool \{)/;
    if (!classPattern.test(nextSource) || !launchPattern.test(nextSource)) {
      throw new Error("AppDelegate no reconocido; no se pueden conservar las opciones de lanzamiento.");
    }
    nextSource = nextSource.replace(classPattern, `$&
  // VIDKAR_SCENE_LAUNCH_OPTIONS
  var vidkarSceneLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?
`).replace(launchPattern, "$1\n    vidkarSceneLaunchOptions = launchOptions");
  }
  if (nextSource !== source) fs.writeFileSync(appDelegatePath, nextSource);
  fs.writeFileSync(filePath, sceneDelegateSource);
  return config;
}]);

const withSceneDelegateSource = (config) => withXcodeProject(config, (config) => {
  const project = config.modResults;
  const target = project.getFirstTarget().uuid;
  const sourcePath = "Vidkar/SceneDelegate.swift";
  const vidkarGroup = project.findPBXGroupKey({ name: "Vidkar" });
  if (!vidkarGroup) {
    throw new Error("No se encontró el grupo Vidkar en el proyecto Xcode.");
  }
  if (!project.hasFile(sourcePath)) {
    project.addSourceFile(sourcePath, { target }, vidkarGroup);
  }
  return config;
});

const withVidkarSceneLifecycle = (config) => {
  config = withSceneManifest(config);
  config = withSceneDelegateFile(config);
  return withSceneDelegateSource(config);
};

module.exports = createRunOncePlugin(
  withVidkarSceneLifecycle,
  pkg.name,
  pkg.version,
);
