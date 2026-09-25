const fs = require("fs");
const path = require("path");
const { createRunOncePlugin, withDangerousMod } = require("@expo/config-plugins");

const pkg = {
  name: "with-vidkar-app-intents",
  version: "1.0.0",
};

const packageDeclaration = `
// VIDKAR_APP_INTENTS_PACKAGE
@available(iOS 17.0, *)
struct VidkarAppIntentsPackage: AppIntentsPackage {
  static var includedPackages: [any AppIntentsPackage.Type] {
    [VidkarMCPAppIntentsPackage.self]
  }
}
`;

const shortcutsProviderDeclaration = `
// VIDKAR_APP_SHORTCUTS_PROVIDER
@available(iOS 17.0, *)
struct VidkarAppShortcutsProvider: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: VIDKARQueryMCPIntent(),
      phrases: [
        "Consulta MCP en \\(.applicationName)",
        "Consulta herramientas MCP en \\(.applicationName)",
      ],
      shortTitle: "Consulta MCP",
      systemImageName: "list.bullet.rectangle"
    )
    AppShortcut(
      intent: VIDKARExecuteMCPIntent(),
      phrases: [
        "Ejecuta MCP en \\(.applicationName)",
        "Ejecuta una herramienta MCP en \\(.applicationName)",
      ],
      shortTitle: "Ejecuta MCP",
      systemImageName: "play.fill"
    )
    AppShortcut(
      intent: VIDKARSearchMoviesIntent(),
      phrases: ["Busca películas en \\(.applicationName)"],
      shortTitle: "Busca película",
      systemImageName: "film"
    )
    AppShortcut(
      intent: VIDKARSearchSeriesIntent(),
      phrases: ["Busca series en \\(.applicationName)"],
      shortTitle: "Busca serie",
      systemImageName: "tv"
    )
    AppShortcut(
      intent: VIDKARSearchCoursesIntent(),
      phrases: ["Busca cursos en \\(.applicationName)"],
      shortTitle: "Busca curso",
      systemImageName: "book.closed"
    )
    AppShortcut(
      intent: VIDKARSearchCommerceProductsIntent(),
      phrases: ["Busca productos en \\(.applicationName)"],
      shortTitle: "Busca en Comercio",
      systemImageName: "shippingbox"
    )
    AppShortcut(
      intent: VIDKARGetServiceUsageIntent(),
      phrases: ["Consulta mi \\(\\.$service) en \\(.applicationName)"],
      shortTitle: "Uso de Proxy o VPN",
      systemImageName: "shield.lefthalf.filled"
    )
  }
}
`;

const withVidkarAppIntents = (config) => withDangerousMod(config, ["ios", (config) => {
  const appDelegatePath = path.join(config.modRequest.platformProjectRoot, "Vidkar", "AppDelegate.swift");
  if (!fs.existsSync(appDelegatePath)) {
    throw new Error("No se encontró Vidkar/AppDelegate.swift para registrar App Intents.");
  }

  let source = fs.readFileSync(appDelegatePath, "utf8");
  for (const importLine of ["import AppIntents", "internal import VidkarMCP"]) {
    if (!source.includes(importLine)) source = `${importLine}\n${source}`;
  }
  if (!source.includes("VIDKAR_APP_INTENTS_PACKAGE")) {
    source = `${source.trimEnd()}\n${packageDeclaration}`;
  }
  if (!source.includes("VIDKAR_APP_SHORTCUTS_PROVIDER")) {
    source = `${source.trimEnd()}\n${shortcutsProviderDeclaration}`;
  }
  fs.writeFileSync(appDelegatePath, source);
  return config;
}]);

module.exports = createRunOncePlugin(
  withVidkarAppIntents,
  pkg.name,
  pkg.version,
);
