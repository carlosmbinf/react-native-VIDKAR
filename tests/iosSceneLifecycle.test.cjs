/* global __dirname */
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const ts = require("typescript");
const withSceneLifecycle = require("../plugins/with-vidkar-ios-scene-lifecycle");
const withAppIntents = require("../plugins/with-vidkar-app-intents");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const run = (command, args) => {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  assert.equal(result.status, 0, `${command}\n${result.error?.message || ""}\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
};
const temporary = (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-scene-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, "Vidkar"));
  return directory;
};
const template = () => run("tar", ["-xOzf", path.join(root, "node_modules/expo/template.tgz"), "package/ios/HelloWorld/AppDelegate.swift"]);
const apply = async (plugin, directory, mod = "dangerous", modResults = {}) => {
  const config = plugin({ name: "Vidkar", slug: "vidkar" });
  return config.mods.ios[mod]({ ...config, modRequest: { platformProjectRoot: directory }, modResults });
};
const generate = async (t, input = template()) => {
  const directory = temporary(t);
  const appPath = path.join(directory, "Vidkar/AppDelegate.swift");
  fs.writeFileSync(appPath, input);
  await apply(withSceneLifecycle, directory);
  return { directory, appPath, scenePath: path.join(directory, "Vidkar/SceneDelegate.swift") };
};

test("plugin real: template instalado, proyecto existente e idempotencia sin borrar orientación ni catálogo", async (t) => {
  const orientation = `
#if os(iOS) || os(tvOS)
  // Fixture ajena al bootstrap: debe sobrevivir aunque sea el primer #if.
  public override func application(_ app: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
    return .portrait
  }
#endif
`;
  for (const input of [template(), read("ios/Vidkar/AppDelegate.swift")]) {
    const { directory, appPath, scenePath } = await generate(t, input.replace("  var window:", `${orientation}\n  var window:`));
    // Orden real app.json: Scene lifecycle, después App Intents (acción background incluida).
    await apply(withAppIntents, directory);
    const firstApp = fs.readFileSync(appPath, "utf8");
    const firstScene = fs.readFileSync(scenePath, "utf8");
    await apply(withSceneLifecycle, directory);
    await apply(withAppIntents, directory);
    assert.equal(fs.readFileSync(appPath, "utf8"), firstApp);
    assert.equal(fs.readFileSync(scenePath, "utf8"), firstScene);
    assert.ok(firstApp.includes(orientation));
    assert.match(firstApp, /VIDKARQueryCatalogIntent\(\)/);
    assert.equal((firstApp.match(/vidkarSceneLaunchOptions = launchOptions/g) || []).length, 1);
    assert.equal((firstApp.match(/return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\)/g) || []).length, 1);
    assert.doesNotMatch(firstApp, /startReactNative\(/);
    // Los callbacks warm deben conservarse literalmente, no recrearse con otros defaults.
    const previousScene = run("git", ["-C", root, "show", "HEAD:plugins/with-vidkar-ios-scene-lifecycle.js"]);
    const warm = previousScene.slice(previousScene.indexOf("  func scene(_ scene: UIScene, openURLContexts"), previousScene.indexOf("\n`;"));
    assert.ok(firstScene.includes(warm));
  }
  let manifest = { UIApplicationSceneManifest: { UIApplicationSupportsMultipleScenes: false, custom: "preserved", UISceneConfigurations: { otherRole: [] } } };
  for (let i = 0; i < 2; i++) manifest = (await apply(withSceneLifecycle, "unused", "infoPlist", manifest)).modResults;
  assert.equal(manifest.UIApplicationSceneManifest.UIApplicationSupportsMultipleScenes, false);
  assert.equal(manifest.UIApplicationSceneManifest.custom, "preserved");
  assert.deepEqual(manifest.UIApplicationSceneManifest.UISceneConfigurations.otherRole, []);
  assert.equal(manifest.UIApplicationSceneManifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication.length, 1);
  let additions = 0;
  const files = new Set();
  const project = {
    getFirstTarget: () => ({ uuid: "fixture-target" }), findPBXGroupKey: () => "fixture-group",
    hasFile: (file) => files.has(file),
    addSourceFile: (file) => { additions++; files.add(file); },
  };
  await apply(withSceneLifecycle, "unused", "xcodeproj", project);
  await apply(withSceneLifecycle, "unused", "xcodeproj", project);
  assert.equal(additions, 1);
});

test("plugin falla sin sobrescribir archivos ante un bootstrap no reconocido", async (t) => {
  const directory = temporary(t);
  const appPath = path.join(directory, "Vidkar/AppDelegate.swift");
  const scenePath = path.join(directory, "Vidkar/SceneDelegate.swift");
  const source = template().replace('withModuleName: "main"', 'withModuleName: "custom"');
  fs.writeFileSync(appPath, source);
  fs.writeFileSync(scenePath, "preserved");
  await assert.rejects(apply(withSceneLifecycle, directory), /Bootstrap AppDelegate no reconocido/);
  assert.equal(fs.readFileSync(appPath, "utf8"), source);
  assert.equal(fs.readFileSync(scenePath, "utf8"), "preserved");
});

// Solo mocks de plataforma/factory. Registry y subscriber Linking se compilan desde
// node_modules; nunca se reimplementa initialURL en el mock ni se parchea el SDK en disco.
const uiKitMock = `
@_exported import Foundation
public protocol UIApplicationDelegate: AnyObject {}
public protocol UIWindowSceneDelegate {}
public protocol UIUserActivityRestoring {}
open class UIResponder: NSObject {}
public class UIApplication: NSObject {
  public static let shared = UIApplication()
  public var delegate: UIApplicationDelegate?
  public struct LaunchOptionsKey: Hashable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let url = Self(rawValue: "UIApplicationLaunchOptionsURLKey")
    public static let sourceApplication = Self(rawValue: "UIApplicationLaunchOptionsSourceApplicationKey")
    public static let annotation = Self(rawValue: "UIApplicationLaunchOptionsAnnotationKey")
    public static let userActivityDictionary = Self(rawValue: "UIApplicationLaunchOptionsUserActivityDictionaryKey")
    public static let userActivityType = Self(rawValue: "UIApplicationLaunchOptionsUserActivityTypeKey")
    public static let remoteNotification = Self(rawValue: "UIApplicationLaunchOptionsRemoteNotificationKey")
  }
  public struct OpenURLOptionsKey: Hashable {
    public let rawValue: String
    public static let sourceApplication = Self(rawValue: "sourceApplication")
    public static let annotation = Self(rawValue: "annotation")
    public static let openInPlace = Self(rawValue: "openInPlace")
  }
}
public class UIScene: NSObject {
  public class ConnectionOptions {
    public var urlContexts: Set<UIOpenURLContext> = []
    public var userActivities: Set<NSUserActivity> = []
    public var notificationResponse: TestNotificationResponse?
    public init() {}
  }
}
public struct TestNotificationResponse {
  public var notification: NotificationValue
  public struct NotificationValue { public var request: Request }
  public struct Request { public var content: Content }
  public struct Content { public var userInfo: [AnyHashable: Any] }
  public init(userInfo: [AnyHashable: Any]) { notification = NotificationValue(request: Request(content: Content(userInfo: userInfo))) }
}
public class UIWindowScene: UIScene {}
public class UISceneSession: NSObject {}
public class UIWindow: NSObject { public init(windowScene: UIWindowScene) {} }
public class UIOpenURLContext: NSObject {
  public let url: URL
  public let options = UISceneOpenURLOptions()
  public init(_ url: URL) { self.url = url }
}
public class UISceneOpenURLOptions {
  public var sourceApplication: String?
  public var annotation: Any?
  public var openInPlace = false
}
public struct UIInterfaceOrientationMask { public static let portrait = Self() }
`;
const reactMock = `
@_exported import UIKit
open class RCTReactNativeFactory {
  public static var starts = 0
  public static var options: [UIApplication.LaunchOptionsKey: Any]?
  public static var onStart: (() -> Void)?
  public init(delegate: Any) {}
  public func startReactNative(withModuleName: String, in window: UIWindow?, launchOptions: [UIApplication.LaunchOptionsKey: Any]?) {
    Self.starts += 1
    Self.options = launchOptions
    Self.onStart?()
  }
}
public class RCTBridge { public var bundleURL: URL? }
public class RCTBundleURLProvider {
  public static func sharedSettings() -> RCTBundleURLProvider { RCTBundleURLProvider() }
  public func jsBundleURL(forBundleRoot: String) -> URL? { nil }
}
public class RCTLinkingManager {
  public static func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any]) -> Bool { true }
  public static func application(_ app: UIApplication, continue activity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool { true }
}
`;
const expoMock = `
@_exported import UIKit
import React
public func sceneTestInitialURL() -> URL? { ExpoLinkingRegistry.shared.initialURL }
public func sceneTestResetURL() { ExpoLinkingRegistry.shared.initialURL = nil }
open class ExpoAppDelegate: UIResponder, UIApplicationDelegate {
  private let linking = LinkingAppDelegateSubscriber()
  public var launches = 0
  public var openedOptions: [UIApplication.OpenURLOptionsKey: Any] = [:]
  public var continuedTypes: [String] = []
  public var receivedLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?
  open func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
    launches += 1
    receivedLaunchOptions = options
    return true
  }
  open func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    openedOptions = options
    return linking.application(app, open: url, options: options)
  }
  open func application(_ app: UIApplication, continue activity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    continuedTypes.append(activity.activityType)
    return linking.application(app, continue: activity, restorationHandler: restorationHandler)
  }
  open func application(_ app: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask { .portrait }
}
open class ExpoReactNativeFactory: RCTReactNativeFactory {}
open class ExpoReactNativeFactoryDelegate {
  public var dependencyProvider: Any?
  public init() {}
  open func sourceURL(for bridge: RCTBridge) -> URL? { nil }
  open func bundleURL() -> URL? { nil }
}
`;

function compileModules(directory, target, sdk, mockUIKit) {
  const flags = ["-sdk", sdk, "-target", target, "-swift-version", "5", "-I", directory, "-L", directory];
  const compile = (name, source, extra = [], dependencies = []) => {
    const file = path.join(directory, `${name}.swift`);
    fs.writeFileSync(file, source);
    run("xcrun", ["swiftc", ...flags, ...(mockUIKit ? ["-D", "SCENE_LIFECYCLE_TEST"] : []),
      "-emit-module", "-emit-library", "-module-name", name, file, ...extra,
      ...dependencies.flatMap((dependency) => ["-l" + dependency]),
      "-emit-module-path", path.join(directory, `${name}.swiftmodule`), "-o", path.join(directory, `lib${name}.dylib`)]);
  };
  if (mockUIKit) compile("UIKit", uiKitMock);
  compile("ExpoModulesCore", "@_exported import UIKit\nopen class ExpoAppDelegateSubscriber: NSObject {}", [], mockUIKit ? ["UIKit"] : []);
  compile("React", reactMock, [], mockUIKit ? ["UIKit"] : []);
  compile("ReactAppDependencyProvider", "public class RCTAppDependencyProvider { public init() {} }");
  const subscriber = path.join(directory, "LinkingAppDelegateSubscriber.swift");
  fs.writeFileSync(subscriber, read("node_modules/expo-linking/ios/LinkingAppDelegateSubscriber.swift")
    .replace("#if os(iOS) || os(tvOS)", "#if SCENE_LIFECYCLE_TEST || os(iOS) || os(tvOS)"));
  compile("Expo", expoMock + '\npublic let onURLReceivedNotification = Notification.Name("onURLReceived")\n',
    [subscriber, path.join(root, "node_modules/expo-linking/ios/ExpoLinkingRegistry.swift")],
    ["ExpoModulesCore", "React", ...(mockUIKit ? ["UIKit"] : [])]);
  return flags;
}

test("SceneDelegate generado: UIKit iPhone/simulador y ejecución fría/caliente con Linking instalado", {
  skip: process.platform !== "darwin" && "Requiere Swift/Xcode (sin app ni dispositivo)",
}, async (t) => {
  const { directory, appPath, scenePath } = await generate(t);
  // Compilar AppDelegate generado completo; solo se retira @main para el harness standalone.
  fs.writeFileSync(appPath, fs.readFileSync(appPath, "utf8").replace("@main\n", ""));
  for (const [sdkName, target] of [["iphoneos", "arm64-apple-ios16.4"], ["iphonesimulator", "arm64-apple-ios16.4-simulator"]]) {
    const output = path.join(directory, sdkName);
    fs.mkdirSync(output);
    const flags = compileModules(output, target, run("xcrun", ["--sdk", sdkName, "--show-sdk-path"]), false);
    run("xcrun", ["swiftc", ...flags, "-emit-module", "-module-name", "SceneCompileTest", appPath, scenePath,
      "-emit-module-path", path.join(output, "SceneCompileTest.swiftmodule")]);
    t.diagnostic(`${target}: AppDelegate + SceneDelegate generados compilados contra UIKit real; factory/Expo aislados.`);
  }
  const output = path.join(directory, "runtime");
  fs.mkdirSync(output);
  const target = run("xcrun", ["swiftc", "-print-target-info"]);
  const flags = compileModules(output, JSON.parse(target).target.triple, run("xcrun", ["--sdk", "macosx", "--show-sdk-path"]), true);
  const binary = path.join(output, "scene-tests");
  run("xcrun", ["swiftc", ...flags, appPath, scenePath, path.join(__dirname, "IOSSceneLifecycleTests.swift"),
    "-lUIKit", "-lReact", "-lExpo", "-lExpoModulesCore", "-lReactAppDependencyProvider", "-Xlinker", "-rpath", "-Xlinker", output, "-o", binary]);
  const snapshots = JSON.parse(run(binary, []));
  assert.ok(snapshots.length >= 10);
  // Consumir los resultados del Swift real en la implementación Router instalada.
  for (const snapshot of snapshots) {
    const exports = {};
    vm.runInNewContext(read("node_modules/expo-router/build/link/linking.js"), {
      exports, window: {}, require: (name) => {
        if (name === "expo-linking") return { getLinkingURL: () => snapshot.expoURL, createURL: () => "vidkar:///" };
        if (name === "react-native") return { Platform: { OS: "ios" } };
        if (name === "../fork/useLinking") return { getInitialURLWithTimeout: () => assert.fail("iOS no debe depender de RCT getInitialURL") };
        return {};
      },
    });
    const initialURL = exports.getInitialURL();
    assert.equal(initialURL, snapshot.expoURL ?? "vidkar:///", snapshot.name);
    assert.equal(snapshot.expoURL, snapshot.rctURL, snapshot.name);
    const resolver = { exports: {} };
    vm.runInNewContext(ts.transpileModule(read("services/navigation/universalLinks.ts"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText, { exports: resolver.exports, URL });
    const native = { exports: {} };
    vm.runInNewContext(ts.transpileModule(read("app/+native-intent.tsx"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText, { exports: native.exports, URL, URLSearchParams, require: () => resolver.exports });
    const destination = native.exports.redirectSystemPath({ path: initialURL, initial: true });
    if (snapshot.name === "invalid-search") assert.equal(destination, "/");
    if (snapshot.name === "search" || snapshot.name === "universal") {
      const resolved = new URL(destination, "https://fixture.example");
      assert.equal(resolved.pathname, "/(normal)/SiriSearch");
      assert.equal(resolved.searchParams.get("query"), "C++ & Swift");
    }
  }
  t.diagnostic(`${snapshots.length} arranques aislados: Expo initialURL y RCT coinciden antes del bootstrap; sin replay; callbacks warm comprobados.`);
});

test("contratos SDK: suscriptor registrado, lectura Expo Router y claves RCT actuales", () => {
  const config = JSON.parse(read("node_modules/expo-linking/expo-module.config.json"));
  assert.ok(config.apple.appDelegateSubscribers.includes("LinkingAppDelegateSubscriber"));
  assert.match(read("node_modules/expo-linking/ios/ExpoLinkingModule.swift"), /Function\("getLinkingURL"\)\s*\{\s*return ExpoLinkingRegistry.shared.initialURL\?\.absoluteString/);
  const rct = read("node_modules/react-native/Libraries/LinkingIOS/RCTLinkingManager.mm");
  for (const key of ["UIApplicationLaunchOptionsURLKey", "UIApplicationLaunchOptionsUserActivityDictionaryKey", "UIApplicationLaunchOptionsUserActivityTypeKey", "UIApplicationLaunchOptionsUserActivityKey", "NSUserActivityTypeBrowsingWeb"]) assert.ok(rct.includes(key), key);
  const appDelegate = read("node_modules/expo/ios/AppDelegates/ExpoAppDelegate.swift");
  assert.match(appDelegate, /return ExpoAppDelegateSubscriberManager.application\(app, open: url, options: options\)/);
  assert.match(appDelegate, /return ExpoAppDelegateSubscriberManager.application\(application, continue: userActivity, restorationHandler: restorationHandler\)/);
});