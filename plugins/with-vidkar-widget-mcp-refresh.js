const fs = require("node:fs");
const path = require("node:path");
const plist = require("@expo/plist").default;
const {
  createRunOncePlugin,
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
} = require("@expo/config-plugins");

const pkg = {
  name: "with-vidkar-widget-mcp-refresh",
  version: "1.0.0",
};

const KEYCHAIN_ACCESS_GROUP = "$(AppIdentifierPrefix)com.vidkar.mcp-widget";
const SHARED_KEYCHAIN_INFO_KEY = "VIDKAR_MCP_WIDGET_KEYCHAIN_ACCESS_GROUP";
const LEGACY_KEYCHAIN_INFO_KEY = "VIDKAR_MCP_LEGACY_KEYCHAIN_ACCESS_GROUP";
const WIDGET_TARGET = "ExpoWidgetsTarget";
const WIDGET_NAME = "ProxyVpnUsageWidget";
const POD_LINE = "    pod 'VidkarMCP', :path => '../modules/vidkar-mcp/ios'";
const REFRESH_MARKER = "// VIDKAR_WIDGET_MCP_REFRESH";
const REFRESH_CONDITION = 'if entry.props?["mcpRefreshAvailable"] as? Bool == true {';
const AVAILABLE_REFRESH_CONDITION = 'if #available(iOS 17.0, *), entry.props?["mcpRefreshAvailable"] as? Bool == true {';

function applyRefreshIntentToWidgetSwift(source) {
  if (source.includes(REFRESH_MARKER)) {
    return source.replace(REFRESH_CONDITION, AVAILABLE_REFRESH_CONDITION);
  }

  const importMarker = "internal import ExpoWidgets";
  if (!source.includes(importMarker)) {
    throw new Error("No se reconoce el archivo Swift generado para el widget VIDKAR.");
  }

  const dynamicView =
    "WidgetsDynamicView(name: entry.name, kind: .widget, node: node, entryIndex: entry.entryIndex, environmentString: widgetEnvironmentString)";
  if (!source.includes(dynamicView)) {
    throw new Error("No se encontró la vista dinámica esperada de ProxyVpnUsageWidget.");
  }

  const updatedSource = source
    .replace(importMarker, `${importMarker}\ninternal import VidkarMCP`)
    .replace(
      dynamicView,
      `${REFRESH_MARKER}\n      ${dynamicView}.overlay(alignment: .topTrailing) {
        ${AVAILABLE_REFRESH_CONDITION}
          Button(intent: ProxyVpnUsageWidgetRefreshIntent()) {
            Image(systemName: "arrow.clockwise")
              .font(.system(size: 13, weight: .semibold))
              .foregroundStyle(.white)
              .frame(width: 32, height: 32)
              .background(.ultraThinMaterial, in: Circle())
          }
          .buttonStyle(.plain)
          .accessibilityLabel("Actualizar consumo desde MCP")
          .padding(.top, 9)
          .padding(.trailing, 9)
        }
      }`,
    );

  return `${updatedSource.trimEnd()}\n\n@available(iOS 17.0, *)\n${REFRESH_MARKER}\nstruct ProxyVpnUsageWidgetRefreshIntent: AppIntent {\n  static var title: LocalizedStringResource = "Actualizar consumo VIDKAR"\n  static var isDiscoverable: Bool = false\n  static var openAppWhenRun: Bool = false\n  static var authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication\n\n  func perform() async throws -> some IntentResult {\n    await VIDKARWidgetUsageRefresh.perform()\n    return .result()\n  }\n}\n`;
}

const withWidgetKeychainEntitlement = (config) =>
  withEntitlementsPlist(config, (config) => {
    const groups = config.modResults["keychain-access-groups"] ?? [];
    if (!groups.includes(KEYCHAIN_ACCESS_GROUP)) {
      config.modResults["keychain-access-groups"] = [KEYCHAIN_ACCESS_GROUP, ...groups];
    }
    return config;
  });

const withWidgetMCPRefresh = (config) => {
  const teamId = String(config.ios?.appleTeamId ?? "").trim();
  if (!teamId) {
    throw new Error("Configura ios.appleTeamId para compartir el Keychain con el widget.");
  }
  const sharedKeychainGroup = `${teamId}.com.vidkar.mcp-widget`;
  const legacyKeychainGroup = `${teamId}.com.vidkar`;

  config = withInfoPlist(config, (config) => {
    config.modResults[SHARED_KEYCHAIN_INFO_KEY] = sharedKeychainGroup;
    config.modResults[LEGACY_KEYCHAIN_INFO_KEY] = legacyKeychainGroup;
    return config;
  });
  config = withWidgetKeychainEntitlement(config);
  return withDangerousMod(config, ["ios", (config) => {
    const iosRoot = config.modRequest.platformProjectRoot;
    const podfilePath = path.join(iosRoot, "Podfile");
    let podfile = fs.readFileSync(podfilePath, "utf8");
    const targetMarker = `target "${WIDGET_TARGET}" do`;
    if (!podfile.includes(targetMarker)) {
      throw new Error(`No se encontró el target CocoaPods ${WIDGET_TARGET}.`);
    }
    if (!podfile.includes(POD_LINE)) {
      podfile = podfile.replace(targetMarker, `${targetMarker}\n${POD_LINE}`);
      fs.writeFileSync(podfilePath, podfile, "utf8");
    }

    const targetDirectory = path.join(iosRoot, WIDGET_TARGET);
    const widgetInfoPath = path.join(targetDirectory, "Info.plist");
    const widgetInfo = plist.parse(fs.readFileSync(widgetInfoPath, "utf8"));
    widgetInfo[SHARED_KEYCHAIN_INFO_KEY] = sharedKeychainGroup;
    widgetInfo[LEGACY_KEYCHAIN_INFO_KEY] = legacyKeychainGroup;
    fs.writeFileSync(widgetInfoPath, plist.build(widgetInfo), "utf8");

    const entitlementsPath = path.join(targetDirectory, `${WIDGET_TARGET}.entitlements`);
    const widgetEntitlements = plist.parse(fs.readFileSync(entitlementsPath, "utf8"));
    const widgetGroups = widgetEntitlements["keychain-access-groups"] ?? [];
    if (!widgetGroups.includes(KEYCHAIN_ACCESS_GROUP)) {
      widgetEntitlements["keychain-access-groups"] = [KEYCHAIN_ACCESS_GROUP, ...widgetGroups];
      fs.writeFileSync(entitlementsPath, plist.build(widgetEntitlements), "utf8");
    }

    const widgetSwiftPath = path.join(targetDirectory, `${WIDGET_NAME}.swift`);
    const widgetSource = fs.readFileSync(widgetSwiftPath, "utf8");
    const updatedSource = applyRefreshIntentToWidgetSwift(widgetSource);
    if (updatedSource !== widgetSource) {
      fs.writeFileSync(widgetSwiftPath, updatedSource, "utf8");
    }
    return config;
  }]);
};

module.exports = createRunOncePlugin(
  withWidgetMCPRefresh,
  pkg.name,
  pkg.version,
);
module.exports.applyRefreshIntentToWidgetSwift = applyRefreshIntentToWidgetSwift;
