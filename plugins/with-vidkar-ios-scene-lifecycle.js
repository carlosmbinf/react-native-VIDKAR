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
  version: "1.0.0",
};

const sceneDelegateSource = `internal import Expo
import React
import UIKit

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

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: nil
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
  fs.writeFileSync(filePath, sceneDelegateSource);

  const appDelegatePath = path.join(config.modRequest.platformProjectRoot, "Vidkar", "AppDelegate.swift");
  if (fs.existsSync(appDelegatePath)) {
    const source = fs.readFileSync(appDelegatePath, "utf8");
    const nextSource = source.replace(
      /\n#if os\(iOS\) \|\| os\(tvOS\)[\s\S]*?#endif\n/,
      "\n",
    );
    if (nextSource !== source) fs.writeFileSync(appDelegatePath, nextSource);
  }
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
