/* global __dirname */
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const withVidkarAppIntents = require("../plugins/with-vidkar-app-intents");
const { expectedIntents, validateMetadata, validateAppBundle } = require("../scripts/validate-app-intents-metadata.cjs");

test("App Intents de producción: extracción del pod y de la app", {
  skip: process.platform !== "darwin" && "Requiere Xcode",
}, async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-metadata-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const run = (args) => {
    const result = spawnSync("xcrun", args, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
    assert.equal(result.status, 0, `${args[0]}\n${result.error?.message || ""}\n${result.stdout}\n${result.stderr}`);
    return result.stdout.trim();
  };
  const sdk = run(["--sdk", "iphoneos", "--show-sdk-path"]);
  const xcodeVersion = run(["xcodebuild", "-version"]).match(/Build version (\S+)/)[1];
  const toolchain = path.dirname(path.dirname(path.dirname(run(["--find", "swiftc"]))));
  const protocols = path.join(directory, "protocols.json");
  fs.writeFileSync(protocols, JSON.stringify([
    "AppIntent", "AppEntity", "AppEnum", "AppIntentsPackage", "AppShortcutsProvider",
    "DynamicOptionsProvider", "EntityQuery", "TransientEntity",
  ]));
  const original = fs.readFileSync(path.join(__dirname, "../modules/vidkar-mcp/ios/VidkarMCPModule.swift"), "utf8");
  const bridgeStart = original.indexOf("public final class VidkarMCPModule: Module {");
  const bridgeEnd = original.indexOf("@available(iOS 17.0, *)\npublic struct VidkarMCPAppIntentsPackage", bridgeStart);
  assert.ok(bridgeStart > 0 && bridgeEnd > bridgeStart);
  const modulePath = path.join(directory, "VidkarMCP.swift");
  fs.writeFileSync(modulePath, (original.slice(0, bridgeStart) + original.slice(bridgeEnd)).replace("import ExpoModulesCore\n", ""));
  const helpers = ["MCPQueryPolicy.swift", "MCPNaturalLanguagePlanner.swift", "MCPInAppSearch.swift"]
    .map((name) => path.join(__dirname, "../modules/vidkar-mcp/ios", name));
  fs.mkdirSync(path.join(directory, "Vidkar"));
  const appPath = path.join(directory, "Vidkar/AppDelegate.swift");
  fs.writeFileSync(appPath, "import Foundation\n");
  const config = withVidkarAppIntents({ name: "Vidkar", slug: "vidkar" });
  await config.mods.ios.dangerous({ ...config, modRequest: { platformProjectRoot: directory }, modResults: {} });

  const extract = (name, sources, dependency) => {
    const output = path.join(directory, name);
    fs.mkdirSync(output);
    const values = path.join(output, "values.swiftconstvalues");
    run(["swiftc", "-sdk", sdk, "-target", "arm64-apple-ios16.4", "-swift-version", "5", "-O",
      "-whole-module-optimization", "-emit-module", "-emit-object", "-module-name", name,
      "-I", directory, "-emit-module-path", path.join(directory, `${name}.swiftmodule`),
      "-emit-localized-strings", "-emit-localized-strings-path", output,
      "-emit-const-values-path", values, "-Xfrontend", "-const-gather-protocols-list", "-Xfrontend", protocols,
      ...sources, "-o", path.join(output, `${name}.o`)]);
    const sourceList = path.join(output, "sources.list");
    const valuesList = path.join(output, "values.list");
    const metadataList = path.join(output, "metadata.list");
    fs.writeFileSync(sourceList, sources.join("\n") + "\n");
    fs.writeFileSync(valuesList, values + "\n");
    fs.writeFileSync(metadataList, dependency ? path.join(dependency, "extract.actionsdata") + "\n" : "");
    const binary = path.join(output, name);
    if (dependency) {
      run(["swiftc", "-sdk", sdk, "-target", "arm64-apple-ios16.4",
        path.join(output, `${name}.o`), path.join(directory, "VidkarMCP/VidkarMCP.o"), "-o", binary]);
    } else {
      run(["libtool", "-static", "-o", binary, path.join(output, `${name}.o`)]);
    }
    run(["appintentsmetadataprocessor", "--output", output, "--toolchain-dir", toolchain,
      "--binary-file", binary, "--bundle-identifier", `test.${name}`,
      "--module-name", name, "--sdk-root", sdk, "--xcode-version", xcodeVersion, "--platform-family", "iOS", "--deployment-target", "16.4",
      "--target-triple", "arm64-apple-ios16.4", "--source-file-list", sourceList,
      "--swift-const-vals-list", valuesList, "--static-metadata-file-list", metadataList,
      "--stringsdata-file", path.join(output, "AppIntents.stringsdata"),
      "--compile-time-extraction", "--deployment-aware-processing"]);
    const metadata = path.join(output, "Metadata.appintents");
    assert.ok(fs.existsSync(metadata), `Sin metadata: ${name}`);
    return metadata;
  };
  const podMetadata = extract("VidkarMCP", [modulePath, ...helpers]);
  const appMetadata = extract("VidkarApp", [appPath], podMetadata);
  const metadata = JSON.parse(fs.readFileSync(path.join(appMetadata, "extract.actionsdata"), "utf8"));
  assert.deepEqual(Object.keys(metadata.actions).sort(), [...expectedIntents].sort());
  assert.equal(metadata.autoShortcuts.length, 7);
  const summary = validateMetadata(metadata);
  const appBundle = path.join(directory, "Vidkar.app");
  fs.mkdirSync(appBundle);
  fs.cpSync(appMetadata, path.join(appBundle, "Metadata.appintents"), { recursive: true });
  run(["xcstringstool", "compile", path.join(directory, "Vidkar/AppIntents/Localizable.xcstrings"),
    "--output-directory", appBundle, "--serialization-format", "binary"]);
  for (const locale of ["en", "es"]) {
    fs.mkdirSync(path.join(appBundle, `${locale}.lproj`), { recursive: true });
    run(["plutil", "-convert", "binary1", "-o", path.join(appBundle, `${locale}.lproj/AppShortcuts.strings`),
      path.join(directory, `Vidkar/AppIntents/${locale}.lproj/AppShortcuts.strings`)]);
  }
  const phrases = JSON.parse(run(["plutil", "-convert", "json", "-o", "-", path.join(appBundle, "es.lproj/AppShortcuts.strings")]));
  for (const shortcut of metadata.autoShortcuts) {
    for (const phrase of shortcut.phraseTemplates) assert.equal(phrases[phrase.key], phrase.key, "Clave extraída y traducción ES exactas");
  }
  const collectKeys = (value) => {
    if (!value || typeof value !== "object") return [];
    return [...(typeof value.key === "string" ? [value.key] : []), ...Object.values(value).flatMap(collectKeys)];
  };
  const localized = JSON.parse(run(["plutil", "-convert", "json", "-o", "-", path.join(appBundle, "es.lproj/Localizable.strings")]));
  for (const key of collectKeys(metadata.actions)) assert.ok(localized[key], `Texto de acción no localizado: ${key}`);
  const extractedStrings = JSON.parse(fs.readFileSync(path.join(directory, "VidkarMCP/VidkarMCP.stringsdata"), "utf8"));
  // %@ solo representa texto dinámico del servidor, no un mensaje de la app.
  for (const key of collectKeys(extractedStrings).filter((key) => key !== "%@")) {
    assert.ok(localized[key], `Texto Swift no localizado: ${key}`);
  }
  const extractedShortcutStrings = JSON.parse(fs.readFileSync(path.join(directory, "VidkarMCP/ExtractedAppShortcutsMetadata.stringsdata"), "utf8"));
  for (const key of collectKeys(extractedShortcutStrings)) {
    assert.ok(localized[key] || phrases[key], `Summary/shortcut no localizado: ${key}`);
  }

  const infoPath = path.join(appBundle, "Info.plist");
  // Igual que el plugin: no imponer CFBundleLocalizations ni cambiar developmentRegion.
  fs.writeFileSync(infoPath, `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>test.VidkarApp</string><key>CFBundleName</key><string>Vidkar</string><key>CFBundleDisplayName</key><string>Vidkar</string><key>CFBundleDevelopmentRegion</key><string>en</string></dict></plist>`);
  fs.mkdirSync(path.join(directory, "training"));
  const training = run(["appintentsnltrainingprocessor", "--infoplist-path", infoPath,
    "--temp-dir-path", path.join(directory, "training"), "--bundle-id", "test.VidkarApp",
    "--product-path", appBundle, "--extracted-metadata-path", path.join(appBundle, "Metadata.appintents"),
    "--source-file", path.join(appBundle, "es.lproj/AppShortcuts.strings"), "--archive-ssu-assets"]);
  const nluPath = path.join(appBundle, "es.lproj/nlu.appintents");
  assert.ok(fs.existsSync(nluPath) && fs.readdirSync(nluPath).length > 0, "Xcode debe producir NLU español, no solo frases fuente");
  t.diagnostic(`Procesador nativo de frases: ${training.includes("archived 2 locales") ? "en/es archivados" : "exit 0"}; es.lproj/nlu.appintents verificado.`);
  const localizationTest = path.join(directory, "localization-test");
  run(["swiftc", path.join(__dirname, "MCPSpanishLocalizationTests.swift"), "-o", localizationTest]);
  const native = spawnSync(localizationTest, [appBundle, "-AppleLanguages", "(es)"], { encoding: "utf8" });
  assert.equal(native.status, 0, native.stderr);
  t.diagnostic(native.stdout.trim());
  t.diagnostic(`Bundle compilado: ${JSON.stringify(validateAppBundle(appBundle))}`);
  t.diagnostic(`${xcodeVersion}: ${summary.actions} acciones, ${summary.shortcuts} shortcuts; schema iOS 27, criterios, scopes y autenticación local verificados; experimental ausente.`);
});