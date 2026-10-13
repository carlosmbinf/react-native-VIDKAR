const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const plist = require("@expo/plist").default;

const withWidgetMCPRefresh = require("../plugins/with-vidkar-widget-mcp-refresh");
const withExpoWidgets = require("expo-widgets/app.plugin").default;
const { applyRefreshIntentToWidgetSwift } = withWidgetMCPRefresh;

const generatedWidgetSource = `import WidgetKit
import SwiftUI
import AppIntents
internal import ExpoWidgets

struct ProxyVpnUsageWidgetEntryView: View {
  var body: some View {
    if let layout = "layout" {
      let node = "node"
      WidgetsDynamicView(name: entry.name, kind: .widget, node: node, entryIndex: entry.entryIndex, environmentString: widgetEnvironmentString)
    }
  }
}
`;

test("genera un botón AppIntent de actualización MCP sin abrir VIDKAR", () => {
  const output = applyRefreshIntentToWidgetSwift(generatedWidgetSource);

  assert.match(output, /internal import VidkarMCP/);
  assert.match(output, /Button\(intent: ProxyVpnUsageWidgetRefreshIntent\(\)\)/);
  assert.match(output, /openAppWhenRun: Bool = false/);
  assert.match(output, /await VIDKARWidgetUsageRefresh\.perform\(\)/);
  assert.match(output, /mcpRefreshAvailable/);
});

test("la transformación del target es idempotente", () => {
  const once = applyRefreshIntentToWidgetSwift(generatedWidgetSource);
  assert.equal(applyRefreshIntentToWidgetSwift(once), once);
});

test("falla de forma explícita si Expo cambia el contrato generado", () => {
  assert.throws(
    () => applyRefreshIntentToWidgetSwift("import SwiftUI\\nstruct ChangedWidget {}"),
    /No se reconoce el archivo Swift generado/,
  );
});

test("el plugin enlaza VidkarMCP y comparte el Keychain sin duplicar cambios", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-widget-plugin-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const targetDirectory = path.join(root, "ExpoWidgetsTarget");
  fs.mkdirSync(targetDirectory);
  fs.writeFileSync(
    path.join(root, "Podfile"),
    'target "ExpoWidgetsTarget" do\n    use_expo_modules_widgets!\nend\n',
  );
  fs.writeFileSync(
    path.join(targetDirectory, "ExpoWidgetsTarget.entitlements"),
    plist.build({ "com.apple.security.application-groups": ["group.com.vidkar"] }),
  );
  fs.writeFileSync(
    path.join(targetDirectory, "Info.plist"),
    plist.build({ ExpoWidgetsAppGroupIdentifier: "group.com.vidkar" }),
  );
  fs.writeFileSync(path.join(targetDirectory, "ProxyVpnUsageWidget.swift"), generatedWidgetSource);

  const config = withWidgetMCPRefresh({
    name: "Vidkar",
    slug: "vidkar",
    ios: { appleTeamId: "4TWB6RN383", entitlements: {} },
  });
  const appEntitlements = await config.mods.ios.entitlements({
    ...config,
    modResults: {},
  });
  assert.ok(appEntitlements.modResults["keychain-access-groups"].includes("$(AppIdentifierPrefix)com.vidkar.mcp-widget"));
  const appInfo = await config.mods.ios.infoPlist({
    ...config,
    modResults: {},
  });
  assert.equal(appInfo.modResults.VIDKAR_MCP_WIDGET_KEYCHAIN_ACCESS_GROUP, "4TWB6RN383.com.vidkar.mcp-widget");
  assert.equal(appInfo.modResults.VIDKAR_MCP_LEGACY_KEYCHAIN_ACCESS_GROUP, "4TWB6RN383.com.vidkar");

  const apply = () => config.mods.ios.dangerous({
    ...config,
    modRequest: { platformProjectRoot: root },
    modResults: {},
  });
  await apply();
  const firstPodfile = fs.readFileSync(path.join(root, "Podfile"), "utf8");
  const firstWidgetSource = fs.readFileSync(path.join(targetDirectory, "ProxyVpnUsageWidget.swift"), "utf8");
  await apply();

  assert.equal(fs.readFileSync(path.join(root, "Podfile"), "utf8"), firstPodfile);
  assert.equal(fs.readFileSync(path.join(targetDirectory, "ProxyVpnUsageWidget.swift"), "utf8"), firstWidgetSource);
  assert.equal((firstPodfile.match(/pod 'VidkarMCP'/g) || []).length, 1);
  assert.match(firstWidgetSource, /ProxyVpnUsageWidgetRefreshIntent/);

  const entitlements = plist.parse(fs.readFileSync(path.join(targetDirectory, "ExpoWidgetsTarget.entitlements"), "utf8"));
  assert.deepEqual(entitlements["com.apple.security.application-groups"], ["group.com.vidkar"]);
  assert.ok(entitlements["keychain-access-groups"].includes("$(AppIdentifierPrefix)com.vidkar.mcp-widget"));
  const info = plist.parse(fs.readFileSync(path.join(targetDirectory, "Info.plist"), "utf8"));
  assert.equal(info.VIDKAR_MCP_WIDGET_KEYCHAIN_ACCESS_GROUP, "4TWB6RN383.com.vidkar.mcp-widget");
  assert.equal(info.VIDKAR_MCP_LEGACY_KEYCHAIN_ACCESS_GROUP, "4TWB6RN383.com.vidkar");
});

test("el prebuild limpio genera ExpoWidgetsTarget antes de aplicar el plugin MCP", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-clean-prebuild-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const iosRoot = path.join(root, "ios");
  fs.mkdirSync(iosRoot);
  fs.writeFileSync(
    path.join(iosRoot, "Podfile"),
    'target "Vidkar" do\n  use_expo_modules!\nend\n',
  );

  const initialConfig = {
    _internal: { projectRoot: root },
    name: "Vidkar",
    slug: "vidkar",
    version: "4.0.875",
    ios: {
      appleTeamId: "4TWB6RN383",
      bundleIdentifier: "com.vidkar",
      deploymentTarget: "16.4",
    },
  };
  let config = withWidgetMCPRefresh(initialConfig);
  config = withExpoWidgets(config, {
    groupIdentifier: "group.com.vidkar",
    widgets: [{
      name: "ProxyVpnUsageWidget",
      displayName: "Consumo Proxy y VPN",
      description: "Consulta el consumo y estado de tus servicios Proxy y VPN.",
      ios: {
        configuration: { title: "Servicio", parameters: {} },
        supportedFamilies: ["systemSmall", "systemMedium", "systemLarge"],
        contentMarginsDisabled: true,
      },
    }],
  });

  await config.mods.ios.dangerous({
    ...config,
    modRequest: {
      projectRoot: root,
      platformProjectRoot: iosRoot,
      platform: "ios",
      modName: "dangerous",
    },
    modResults: {},
  });

  const targetDirectory = path.join(iosRoot, "ExpoWidgetsTarget");
  const podfile = fs.readFileSync(path.join(iosRoot, "Podfile"), "utf8");
  const widgetSource = fs.readFileSync(path.join(targetDirectory, "ProxyVpnUsageWidget.swift"), "utf8");
  assert.ok(fs.existsSync(path.join(targetDirectory, "Info.plist")));
  assert.ok(podfile.includes('target "ExpoWidgetsTarget" do'));
  assert.ok(podfile.includes("pod 'VidkarMCP', :path => '../modules/vidkar-mcp/ios'"));
  assert.match(widgetSource, /ProxyVpnUsageWidgetRefreshIntent/);
});

test("el AppIntent interactivo compila para simulador y dispositivo iOS", {
  skip: process.platform !== "darwin",
}, (t) => {
  const generated = applyRefreshIntentToWidgetSwift(generatedWidgetSource);
  const intentMarker = "@available(iOS 17.0, *)\n// VIDKAR_WIDGET_MCP_REFRESH\nstruct ProxyVpnUsageWidgetRefreshIntent";
  const intentStart = generated.lastIndexOf(intentMarker);
  assert.notEqual(intentStart, -1);
  const source = `import AppIntents
import SwiftUI

enum VIDKARWidgetUsageRefresh {
  static func perform() async {}
}

${generated.slice(intentStart)}

struct WidgetRefreshButtonFixture: View {
  var body: some View {
    Button(intent: ProxyVpnUsageWidgetRefreshIntent()) {
      Image(systemName: "arrow.clockwise")
        .foregroundStyle(.white)
        .frame(width: 32, height: 32)
        .background(.ultraThinMaterial, in: Circle())
    }
  }
}
`;
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-widget-intent-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const sourcePath = path.join(directory, "WidgetRefresh.swift");
  fs.writeFileSync(sourcePath, source);

  for (const [sdkName, target] of [
    ["iphonesimulator", `${process.arch === "arm64" ? "arm64" : "x86_64"}-apple-ios17.0-simulator`],
    ["iphoneos", "arm64-apple-ios17.0"],
  ]) {
    const sdkResult = spawnSync("xcrun", ["--sdk", sdkName, "--show-sdk-path"], { encoding: "utf8" });
    assert.equal(sdkResult.status, 0, sdkResult.stderr);
    const compile = spawnSync("xcrun", [
      "swiftc", "-sdk", sdkResult.stdout.trim(), "-target", target,
      "-swift-version", "5", "-typecheck", sourcePath,
    ], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
    assert.equal(compile.status, 0, `${sdkName}: ${compile.stderr || compile.stdout}`);
  }
});
