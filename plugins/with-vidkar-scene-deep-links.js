const fs = require("fs");
const path = require("path");
const { createRunOncePlugin, withDangerousMod } = require("@expo/config-plugins");

const pkg = {
  name: "with-vidkar-scene-deep-links",
  version: "1.0.0",
};

const SCENE_IMPORT = "import React";
const SCENE_HANDLERS = `

  private func handleIncomingURL(_ url: URL) {
    _ = RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
  }

  private func handleIncomingUserActivity(_ userActivity: NSUserActivity) {
    _ = RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    URLContexts.forEach { context in
      handleIncomingURL(context.url)
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    handleIncomingUserActivity(userActivity)
  }
`;

const findSceneDelegate = (iosProjectRoot) => {
  const sceneDelegate = path.join(iosProjectRoot, "SceneDelegate.swift");
  return fs.existsSync(sceneDelegate) ? sceneDelegate : null;
};

const findAppDelegate = (iosProjectRoot) => {
  const appDelegate = path.join(iosProjectRoot, "Vidkar", "AppDelegate.swift");
  return fs.existsSync(appDelegate) ? appDelegate : null;
};

const patchAppDelegate = (appDelegateFile) => {
  if (!appDelegateFile) return;

  const source = fs.readFileSync(appDelegateFile, "utf8");
  const marker = "    let launchWindow = UIWindow(frame: UIScreen.main.bounds)\n    launchWindow.makeKeyAndVisible()";
  const replacement = "    let launchWindow = UIWindow(frame: UIScreen.main.bounds)\n    self.window = launchWindow\n    launchWindow.makeKeyAndVisible()";
  const nextSource = source.includes("self.window = launchWindow")
    ? source
    : source.replace(marker, replacement);

  if (nextSource !== source) {
    fs.writeFileSync(appDelegateFile, nextSource);
    console.log("[with-vidkar-scene-deep-links] AppDelegate window asignada");
  }
};

const patchSceneDelegate = (sceneDelegateFile) => {
  if (!sceneDelegateFile) return;

  const source = fs.readFileSync(sceneDelegateFile, "utf8");
  let nextSource = source;

  if (!nextSource.includes(SCENE_IMPORT)) {
    nextSource = `${SCENE_IMPORT}\n${nextSource}`;
  }

  if (!nextSource.includes("handleIncomingURL")) {
    const classEnd = nextSource.lastIndexOf("\n}\n");
    if (classEnd >= 0) {
      nextSource = `${nextSource.slice(0, classEnd)}${SCENE_HANDLERS}${nextSource.slice(classEnd)}`;
    }
  }

  const connectionOptionsMarker = "    window?.makeKeyAndVisible()";
  if (!nextSource.includes("connectionOptions.urlContexts")) {
    nextSource = nextSource.replace(
      connectionOptionsMarker,
      `    connectionOptions.urlContexts.forEach { context in\n      handleIncomingURL(context.url)\n    }\n\n    connectionOptions.userActivities.forEach { userActivity in\n      handleIncomingUserActivity(userActivity)\n    }\n\n${connectionOptionsMarker}`,
    );
  }

  if (nextSource !== source) {
    fs.writeFileSync(sceneDelegateFile, nextSource);
    console.log("[with-vidkar-scene-deep-links] SceneDelegate actualizado");
  }
};

const withVidkarSceneDeepLinks = (config) =>
  withDangerousMod(config, ["ios", (dangerousConfig) => {
    patchAppDelegate(findAppDelegate(dangerousConfig.modRequest.platformProjectRoot));
    patchSceneDelegate(findSceneDelegate(dangerousConfig.modRequest.platformProjectRoot));
    return dangerousConfig;
  }]);

module.exports = createRunOncePlugin(
  withVidkarSceneDeepLinks,
  pkg.name,
  pkg.version,
);
