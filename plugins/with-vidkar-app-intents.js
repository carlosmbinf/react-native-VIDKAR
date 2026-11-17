/* global __dirname */
const fs = require("fs");
const path = require("path");
const { createRunOncePlugin, withDangerousMod, withXcodeProject } = require("@expo/config-plugins");

const pkg = {
  name: "with-vidkar-app-intents",
  version: "1.3.0",
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
      intent: VIDKARSearchUserByUsernameIntent(),
      phrases: ["Busca un usuario en \\(.applicationName)", "Buscar usuario en \\(.applicationName)", "Encuentra un usuario en \\(.applicationName)", "Busca el username en \\(.applicationName)"],
      shortTitle: "Buscar usuario",
      systemImageName: "person.crop.circle.magnifyingglass"
    )
    AppShortcut(intent: VIDKARSearchMoviesIntent(), phrases: ["Busca películas en \\(.applicationName)", "Buscar una película en \\(.applicationName)", "Qué películas hay en \\(.applicationName)", "Encuentra una película en \\(.applicationName)"], shortTitle: "Películas", systemImageName: "film")
    AppShortcut(intent: VIDKARSearchSeriesIntent(), phrases: ["Busca series en \\(.applicationName)", "Buscar una serie en \\(.applicationName)", "Qué series hay en \\(.applicationName)", "Encuentra una serie en \\(.applicationName)"], shortTitle: "Series", systemImageName: "tv")
    AppShortcut(intent: VIDKARSearchCoursesIntent(), phrases: ["Busca cursos en \\(.applicationName)", "Buscar un curso en \\(.applicationName)", "Qué cursos hay en \\(.applicationName)", "Encuentra un curso en \\(.applicationName)"], shortTitle: "Cursos", systemImageName: "book.closed")
    AppShortcut(intent: VIDKARSearchCommerceProductsIntent(), phrases: ["Busca productos en \\(.applicationName)", "Buscar un producto en \\(.applicationName)", "Qué productos hay en \\(.applicationName)", "Encuentra un producto en \\(.applicationName)"], shortTitle: "Comercio", systemImageName: "shippingbox")
    AppShortcut(intent: VIDKARGetMyRecordsIntent(), phrases: ["Consulta mi cuenta en \\(.applicationName)", "Cómo está mi cuenta en \\(.applicationName)", "Muéstrame mi cuenta de \\(.applicationName)", "Mis datos en \\(.applicationName)"], shortTitle: "Mi cuenta", systemImageName: "person.crop.circle")
    AppShortcut(intent: VIDKARGetUserServiceUsageIntent(), phrases: ["Consulta consumo de un usuario en \\(.applicationName)", "Cuánto ha consumido un usuario en \\(.applicationName)", "Consumo de usuario en \\(.applicationName)"], shortTitle: "Consumo de usuario", systemImageName: "gauge")
    AppShortcut(intent: VIDKARGetUserSalesIntent(), phrases: ["Consulta ventas de un usuario en \\(.applicationName)", "Cuánto ha comprado un usuario en \\(.applicationName)", "Ventas de usuario en \\(.applicationName)"], shortTitle: "Ventas de usuario", systemImageName: "chart.bar")
    AppShortcut(intent: VIDKARGetUserRecordsIntent(), phrases: ["Consulta datos de un usuario en \\(.applicationName)", "Muéstrame los datos de un usuario en \\(.applicationName)", "Ficha de usuario en \\(.applicationName)"], shortTitle: "Datos de usuario", systemImageName: "list.bullet.rectangle")
    AppShortcut(intent: VIDKARGetBusinessReportIntent(), phrases: ["Consulta el negocio en \\(.applicationName)", "Cómo va el negocio en \\(.applicationName)", "Resumen del negocio en \\(.applicationName)", "Muéstrame las ventas de \\(.applicationName)"], shortTitle: "Mi negocio", systemImageName: "chart.pie")
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
const previewFlag = "VIDKAR_SIRI_AI_PREVIEW";
const skillsResource = "Vidkar/AppIntents/Skills.skillsbundle";
const previewStart = "\n// VIDKAR_SIRI_AI_PREVIEW_BEGIN\n";
const previewEnd = "\n// VIDKAR_SIRI_AI_PREVIEW_END\n";
const unquote = (value) => String(value).replace(/^"|"$/g, "");

function syncSiriAIPreview(source, enabled) {
  const start = source.indexOf(previewStart);
  if (start !== -1) {
    const end = source.indexOf(previewEnd, start + previewStart.length);
    if (end === -1) throw new Error("Bloque Siri AI Preview incompleto en AppDelegate.swift.");
    source = source.slice(0, start) + source.slice(end + previewEnd.length);
  }
  if (!enabled) return source;

  const template = path.join(__dirname, "resources", "vidkar-app-intents", "SiriAIPreview.swift");
  return `${source}${previewStart}${fs.readFileSync(template, "utf8").trimEnd()}${previewEnd}`;
}

function syncPreviewBuildSetting(settings, enabled) {
  const key = "SWIFT_ACTIVE_COMPILATION_CONDITIONS";
  const original = settings[key];
  const conditions = Array.isArray(original) ? original : unquote(original ?? "").split(/\s+/).filter(Boolean);
  const next = conditions.filter((value) => unquote(value) !== previewFlag);
  if (enabled) next.push(previewFlag);
  else if (next.length === conditions.length) return;

  // Let a target inherit the project and CocoaPods settings when adding its first condition.
  if (enabled && next.length === 1) next.unshift("$(inherited)");
  if (!enabled && (next.length === 0 || (next.length === 1 && unquote(next[0]) === "$(inherited)"))) {
    delete settings[key];
  } else {
    settings[key] = Array.isArray(original) ? next : `"${next.join(" ")}"`;
  }
}

const withVidkarAppIntents = (config, { siriAIPreview = false } = {}) => {
  const override = process.env[previewFlag];
  const previewEnabled = override === "1" || (siriAIPreview && override !== "0");
  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const target = Object.entries(project.pbxNativeTargetSection()).find(([key, value]) =>
      !key.endsWith("_comment") && unquote(value.name) === "Vidkar"
      && unquote(value.productType) === "com.apple.product-type.application");
    if (!target) throw new Error("No se encontró el target principal Vidkar para localizar App Intents.");
    const configurations = project.pbxXCConfigurationList()?.[target[1].buildConfigurationList]
      ?.buildConfigurations.map(({ value }) => project.pbxXCBuildConfigurationSection()[value]);
    for (const name of ["Debug", "Release"]) {
      const settings = configurations?.find((entry) => unquote(entry?.name) === name)?.buildSettings;
      if (settings) syncPreviewBuildSetting(settings, previewEnabled);
      else if (previewEnabled) throw new Error(`No se encontró la configuración ${name} de Vidkar para Siri AI Preview.`);
    }
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
    if (previewEnabled) {
      project.addResourceFile(skillsResource, { target: target[0], lastKnownFileType: "wrapper.skillsbundle" }, root.mainGroup);
    } else if (project.hasFile(skillsResource)) {
      project.removeResourceFile(skillsResource, { target: target[0] }, root.mainGroup);
    }
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
  source = syncSiriAIPreview(source, previewEnabled);
  fs.writeFileSync(appDelegatePath, source);
  const resourcesPath = path.join(path.dirname(appDelegatePath), "AppIntents");
  fs.mkdirSync(resourcesPath, { recursive: true });
  const skillsPath = path.join(resourcesPath, "Skills.skillsbundle");
  if (previewEnabled) {
    fs.cpSync(path.join(__dirname, "resources", "vidkar-app-intents", "Skills.skillsbundle"), skillsPath, { recursive: true });
  } else if (fs.existsSync(skillsPath)) {
    fs.rmSync(skillsPath, { recursive: true, force: true });
  }
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
