/* global __dirname */
const fs = require("fs");
const path = require("path");
const { createRunOncePlugin, withDangerousMod, withXcodeProject } = require("@expo/config-plugins");

const pkg = {
  name: "with-vidkar-app-intents",
  version: "1.2.0",
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
    AppShortcut(
      intent: VIDKARQueryCatalogIntent(),
      phrases: ["Consulta el catálogo en \\(.applicationName)"],
      shortTitle: "Consulta el catálogo",
      systemImageName: "magnifyingglass"
    )
  }
}
// VIDKAR_APP_SHORTCUTS_PROVIDER_END
`;

function migrateShortcutsProvider(source) {
  const marker = "// VIDKAR_APP_SHORTCUTS_PROVIDER";
  const start = source.indexOf(marker);
  if (start < 0) {
    if (/struct\s+VidkarAppShortcutsProvider\b/.test(source)) {
      throw new Error("Provider sin marcador de propiedad; no se sobrescribe AppDelegate.");
    }
    return `${source.trimEnd()}\n${shortcutsProviderDeclaration}`;
  }
  // El bloque histórico no tenía marcador final. Exigir su forma conocida,
  // terminando en las dos llaves de nivel superior, no en el final del archivo.
  const block = /^\/\/ VIDKAR_APP_SHORTCUTS_PROVIDER\r?\n@available\(iOS 17\.0, \*\)\r?\nstruct VidkarAppShortcutsProvider: AppShortcutsProvider \{\r?\n  static var appShortcuts: \[AppShortcut\] \{\r?\n[\s\S]*?\r?\n  \}\r?\n\}(?:\r?\n\/\/ VIDKAR_APP_SHORTCUTS_PROVIDER_END)?/.exec(source.slice(start));
  if (!block) throw new Error("Bloque App Shortcuts no reconocido; se conserva AppDelegate sin sobrescribirlo.");
  return source.slice(0, start) + shortcutsProviderDeclaration.trim() + source.slice(start + block[0].length);
}

const resourceNames = ["AppShortcuts.xcstrings", "Localizable.xcstrings"];

const withVidkarAppIntents = (config) => {
  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const unquote = (value) => String(value).replace(/^"|"$/g, "");
    const target = Object.entries(project.pbxNativeTargetSection()).find(([key, value]) =>
      !key.endsWith("_comment") && unquote(value.name) === "Vidkar"
      && unquote(value.productType) === "com.apple.product-type.application");
    if (!target) throw new Error("No se encontró el target principal Vidkar para localizar App Intents.");
    const root = project.getFirstProject().firstProject;
    root.knownRegions = [...new Set([...(root.knownRegions || []).map(unquote), "en", "Base", "es"])];
    if (!project.pbxGroupByName("Resources")) {
      const group = project.addPbxGroup([], "Resources");
      project.getPBXGroupByKey(root.mainGroup).children.push({ value: group.uuid, comment: "Resources" });
    }
    // LocalizedStringResource usa .main por defecto, también desde el pod estático
    // VidkarMCP (sin resource_bundles). No cambiar developmentRegion ni usar #bundle.
    // Xcode exige iOS 17 para AppShortcuts.xcstrings. Mantener iOS 16.4 usando
    // .strings generados del catálogo, también al actualizar un proyecto existente.
    const oldShortcuts = "Vidkar/AppIntents/AppShortcuts.xcstrings";
    if (project.hasFile(oldShortcuts)) {
      project.removeResourceFile(oldShortcuts, { target: target[0] }, root.mainGroup);
    }
    project.addResourceFile("Vidkar/AppIntents/Localizable.xcstrings", { target: target[0], lastKnownFileType: "text.json.xcstrings" }, root.mainGroup);
    for (const locale of ["en", "es"]) {
      project.addResourceFile(`Vidkar/AppIntents/${locale}.lproj/AppShortcuts.strings`, { target: target[0], lastKnownFileType: "text.plist.strings" }, root.mainGroup);
    }
    return config;
  });
  return withDangerousMod(config, ["ios", (config) => {
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
  source = migrateShortcutsProvider(source);
  fs.writeFileSync(appDelegatePath, source);
  const resourcesPath = path.join(path.dirname(appDelegatePath), "AppIntents");
  fs.mkdirSync(resourcesPath, { recursive: true });
  for (const name of resourceNames) {
    fs.copyFileSync(path.join(__dirname, "resources", "vidkar-app-intents", name), path.join(resourcesPath, name));
  }
  const shortcuts = JSON.parse(fs.readFileSync(path.join(resourcesPath, "AppShortcuts.xcstrings"), "utf8"));
  for (const locale of ["en", "es"]) {
    const lines = Object.entries(shortcuts.strings).map(([key, entry]) => {
      const value = locale === shortcuts.sourceLanguage ? key : entry.localizations?.[locale]?.stringUnit?.value;
      if (typeof value !== "string" || !value.trim()) throw new Error(`Falta frase ${locale}: ${key}`);
      return `${JSON.stringify(key)} = ${JSON.stringify(value)};`;
    });
    const localePath = path.join(resourcesPath, `${locale}.lproj`);
    fs.mkdirSync(localePath, { recursive: true });
    fs.writeFileSync(path.join(localePath, "AppShortcuts.strings"), `${lines.join("\n")}\n`);
  }
  return config;
  }]);
};

module.exports = createRunOncePlugin(
  withVidkarAppIntents,
  pkg.name,
  pkg.version,
);
