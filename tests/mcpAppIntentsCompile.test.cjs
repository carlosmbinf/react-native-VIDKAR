/* global __dirname */
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const withVidkarAppIntents = require("../plugins/with-vidkar-app-intents");
const { siriPreviewParameters } = require("../scripts/validate-app-intents-metadata.cjs");

test("plugin: recursos solo en el target principal, idempotencia y regiones conservadas", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-plugin-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const project = require("xcode").project(path.join(directory, "fixture.pbxproj"));
  project.hash = { project: { objects: {
    PBXProject: { ROOT: { isa: "PBXProject", mainGroup: "GROUP", developmentRegion: "en", knownRegions: ["en", "Base", "fr"], targets: [{ value: "WATCH" }, { value: "APP" }] } },
    PBXNativeTarget: {
      WATCH: { isa: "PBXNativeTarget", name: "Watch", productType: '"com.apple.product-type.application"', buildPhases: [{ value: "WATCHRES", comment: "Resources" }] },
      APP: { isa: "PBXNativeTarget", name: '"Vidkar"', productType: '"com.apple.product-type.application"', buildPhases: [{ value: "APPRES", comment: "Resources" }] },
    },
    PBXResourcesBuildPhase: { WATCHRES: { isa: "PBXResourcesBuildPhase", files: [] }, WATCHRES_comment: "Resources", APPRES: { isa: "PBXResourcesBuildPhase", files: [] }, APPRES_comment: "Resources" },
    PBXGroup: { GROUP: { isa: "PBXGroup", children: [] } },
    PBXFileReference: {}, PBXBuildFile: {},
  } } };
  // Simular el catálogo registrado por la versión anterior del plugin.
  const resources = project.addPbxGroup([], "Resources");
  project.getPBXGroupByKey("GROUP").children.push({ value: resources.uuid, comment: "Resources" });
  project.addResourceFile("Vidkar/AppIntents/AppShortcuts.xcstrings", { target: "APP", lastKnownFileType: "text.json.xcstrings" }, "GROUP");
  fs.mkdirSync(path.join(directory, "Vidkar"));
  fs.writeFileSync(path.join(directory, "Vidkar/AppDelegate.swift"), "import Foundation\n// conservar cambios previos\n");
  const config = withVidkarAppIntents({ name: "Vidkar", slug: "vidkar" });
  const apply = async () => {
    await config.mods.ios.xcodeproj({ ...config, modRequest: { platformProjectRoot: directory }, modResults: project });
    await config.mods.ios.dangerous({ ...config, modRequest: { platformProjectRoot: directory }, modResults: {} });
  };
  await apply();
  const before = JSON.stringify(project.hash);
  const swift = fs.readFileSync(path.join(directory, "Vidkar/AppDelegate.swift"), "utf8");
  await apply();
  assert.equal(JSON.stringify(project.hash), before);
  assert.equal(fs.readFileSync(path.join(directory, "Vidkar/AppDelegate.swift"), "utf8"), swift);
  assert.ok(swift.includes("// conservar cambios previos"));
  const objects = project.hash.project.objects;
  assert.equal(objects.PBXProject.ROOT.developmentRegion, "en");
  assert.deepEqual(objects.PBXProject.ROOT.knownRegions, ["en", "Base", "fr", "es"]);
  assert.equal(objects.PBXResourcesBuildPhase.APPRES.files.length, 3);
  assert.equal(objects.PBXResourcesBuildPhase.WATCHRES.files.length, 0);
  assert.equal(project.hasFile("Vidkar/AppIntents/AppShortcuts.xcstrings"), false);
  for (const file of Object.values(objects.PBXFileReference).filter((value) => typeof value === "object")) {
    assert.equal(file.lastKnownFileType, file.path.includes(".lproj/") ? "text.plist.strings" : "text.json.xcstrings");
  }
  for (const name of ["AppShortcuts.xcstrings", "Localizable.xcstrings"]) {
    assert.equal(fs.readFileSync(path.join(directory, "Vidkar/AppIntents", name), "utf8"),
      fs.readFileSync(path.join(__dirname, "../plugins/resources/vidkar-app-intents", name), "utf8"));
  }
  const catalog = JSON.parse(fs.readFileSync(path.join(directory, "Vidkar/AppIntents/AppShortcuts.xcstrings"), "utf8"));
  const phrases = [...swift.matchAll(/"([^"\n]*\\\(\.applicationName\)[^"\n]*)"/g)].map((match) =>
    match[1].replaceAll("\\(.applicationName)", "${applicationName}")
      .replaceAll("\\(\\.$service)", "${service}")
      .replaceAll("\\(\\.$username)", "${username}"));
  assert.deepEqual(Object.keys(catalog.strings).sort(), phrases.sort());
  for (const [key, value] of Object.entries(catalog.strings)) assert.equal(value.localizations.es.stringUnit.value, key);
  for (const locale of ["en", "es"]) {
    const strings = fs.readFileSync(path.join(directory, `Vidkar/AppIntents/${locale}.lproj/AppShortcuts.strings`), "utf8");
    for (const key of phrases) assert.ok(strings.includes(`${JSON.stringify(key)} = ${JSON.stringify(key)};`));
  }
});

test("plugin migra provider histórico conservando código anterior/posterior", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-provider-migration-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, "Vidkar"));
  const file = path.join(directory, "Vidkar/AppDelegate.swift");
  const config = withVidkarAppIntents({ name: "Vidkar", slug: "vidkar" });
  const apply = () => config.mods.ios.dangerous({ ...config, modRequest: { platformProjectRoot: directory }, modResults: {} });
  fs.writeFileSync(file, "import Foundation\n// cambio ajeno previo\n");
  await apply();
  const fresh = fs.readFileSync(file, "utf8");
  const shortcut = /    AppShortcut\([\s\S]*?\n    \)\n/.exec(fresh)?.[0];
  assert.ok(shortcut);
  const old = fresh.replace(shortcut, shortcut.repeat(8)).replace("// VIDKAR_APP_SHORTCUTS_PROVIDER_END\n", "");
  assert.equal((old.match(/    AppShortcut\(/g) || []).length, 17);
  const suffix = '\n// cambio ajeno posterior\nstruct Other { let braces = "{}" }\n';
  fs.writeFileSync(file, old + suffix);
  await apply();
  const migrated = fs.readFileSync(file, "utf8");
  assert.equal(migrated, fresh + suffix);
  assert.equal((migrated.match(/    AppShortcut\(/g) || []).length, 10);
  await apply();
  assert.equal(fs.readFileSync(file, "utf8"), migrated);
  const unknown = old.replace("  static var appShortcuts", "  // formato no reconocido\n  static var appShortcuts") + suffix;
  fs.writeFileSync(file, unknown);
  await assert.rejects(apply, /no reconocido/);
  assert.equal(fs.readFileSync(file, "utf8"), unknown);
});

test("plugin activa Siri AI en Debug y Release mediante la configuración Expo y permite desactivarlo", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-siri-preview-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const previous = process.env.VIDKAR_SIRI_AI_PREVIEW;
  t.after(() => {
    if (previous === undefined) delete process.env.VIDKAR_SIRI_AI_PREVIEW;
    else process.env.VIDKAR_SIRI_AI_PREVIEW = previous;
  });
  const appDirectory = path.join(directory, "Vidkar");
  const file = path.join(appDirectory, "AppDelegate.swift");
  fs.mkdirSync(appDirectory);
  fs.writeFileSync(file, "import Foundation\n");
  const project = require("xcode").project(path.join(directory, "fixture.pbxproj"));
  const debug = { name: "Debug", buildSettings: {} };
  const release = { name: "Release", buildSettings: {} };
  project.hash = { project: { objects: {
    PBXProject: { ROOT: { mainGroup: "GROUP", targets: [{ value: "APP" }] } },
    PBXNativeTarget: { APP: { name: "Vidkar", productType: "com.apple.product-type.application", buildConfigurationList: "CONFIGS", buildPhases: [{ value: "RES", comment: "Resources" }] } },
    XCConfigurationList: { CONFIGS: { buildConfigurations: [{ value: "D" }, { value: "R" }] } },
    XCBuildConfiguration: { D: debug, R: release },
    PBXResourcesBuildPhase: { RES: { isa: "PBXResourcesBuildPhase", files: [] }, RES_comment: "Resources" },
    PBXGroup: { GROUP: { isa: "PBXGroup", children: [] } },
    PBXFileReference: {}, PBXBuildFile: {},
  } } };

  const apply = async (siriAIPreview = true) => {
    const config = withVidkarAppIntents({ name: "Vidkar", slug: "vidkar" }, { siriAIPreview });
    const modRequest = { platformProjectRoot: directory };
    await config.mods.ios.xcodeproj({ ...config, modRequest, modResults: project });
    await config.mods.ios.dangerous({
      ...config,
      modRequest,
      modResults: {},
    });
    return fs.readFileSync(file, "utf8");
  };
  delete process.env.VIDKAR_SIRI_AI_PREVIEW;
  const stable = await apply(false);
  assert.doesNotMatch(stable, /SIRI_AI_PREVIEW|@AppIntent\(\.tool\)/);
  assert.deepEqual(debug.buildSettings, {});

  const preview = await apply();
  assert.ok(preview.startsWith(stable.replace("internal import VidkarMCP", "public import VidkarMCP")));
  assert.match(preview, /#if VIDKAR_SIRI_AI_PREVIEW/);
  const toolIntents = [...preview.matchAll(/@AppIntent\(\.tool\)\s+struct (\w+)/g)].map((match) => match[1]);
  assert.deepEqual(toolIntents.sort(), Object.keys(siriPreviewParameters).sort());
  assert.match(preview, /struct VIDKARSiriResult: TransientAppEntity, SnippetRepresentableEntity/);
  assert.match(preview, /CardSnippet\(supportedFamilies: \[\.compact, \.standard\]\)/);
  assert.match(preview, /ReturnsValue<\[VIDKARUserSearchAppEntity\]> \{[\s\S]*?return \.result\(value: users\)/);
  assert.equal((preview.match(/ReturnsValue<\[VIDKARPreviewCatalogEntity\]>/g) ?? []).length, 2);
  assert.match(preview, /VIDKARCommerceCatalog\.products\(matching: query, includeThumbnails: true\)/);
  assert.doesNotMatch(preview, /offerVIDKARInAppSearch|OpenURLIntent|requestToContinueInForeground/);
  const skillRef = project.hasFile("Vidkar/AppIntents/Skills.skillsbundle");
  assert.ok(skillRef);
  assert.equal(skillRef.lastKnownFileType, "wrapper.skillsbundle");
  const skill = path.join(appDirectory, "AppIntents/Skills.skillsbundle/Skills/vidkar-catalogo/SKILL.md");
  const content = fs.readFileSync(skill, "utf8");
  assert.doesNotMatch(content, /\bsiri(?:kit)?\b/i);
  assert.doesNotMatch(preview, /"[^"\n]*\bsiri(?:kit)?\b[^"\n]*"/i);
  const parts = /^---\nname: ([a-z0-9]+(?:-[a-z0-9]+)*)\ndescription: ([^\n]+)\n---\n([\s\S]*)$/.exec(content);
  assert.ok(parts);
  assert.equal(parts[1], "vidkar-catalogo");
  assert.ok(parts[2].length <= 1024 && parts[3].length <= 10000);
  assert.equal(project.hash.project.objects.PBXResourcesBuildPhase.RES.files.length, 4);
  assert.equal(debug.buildSettings.SWIFT_ACTIVE_COMPILATION_CONDITIONS, '"$(inherited) VIDKAR_SIRI_AI_PREVIEW"');
  assert.equal(release.buildSettings.SWIFT_ACTIVE_COMPILATION_CONDITIONS, '"$(inherited) VIDKAR_SIRI_AI_PREVIEW"');
  assert.equal(await apply(), preview);
  assert.equal(debug.buildSettings.SWIFT_ACTIVE_COMPILATION_CONDITIONS, '"$(inherited) VIDKAR_SIRI_AI_PREVIEW"');

  const suffix = "\n// Cambio ajeno al plugin\n";
  fs.appendFileSync(file, suffix);
  process.env.VIDKAR_SIRI_AI_PREVIEW = "0";
  assert.equal(await apply(), stable + suffix);
  assert.deepEqual(debug.buildSettings, {});
  assert.deepEqual(release.buildSettings, {});
  assert.equal(project.hasFile("Vidkar/AppIntents/Skills.skillsbundle"), false);
  assert.equal(fs.existsSync(skill), false);

  debug.buildSettings.SWIFT_ACTIVE_COMPILATION_CONDITIONS = '"$(inherited) OTHER_FLAG"';
  process.env.VIDKAR_SIRI_AI_PREVIEW = "1";
  await apply();
  assert.equal(debug.buildSettings.SWIFT_ACTIVE_COMPILATION_CONDITIONS, '"$(inherited) OTHER_FLAG VIDKAR_SIRI_AI_PREVIEW"');
  delete process.env.VIDKAR_SIRI_AI_PREVIEW;
  assert.equal(await apply(false), stable + suffix);
  assert.equal(debug.buildSettings.SWIFT_ACTIVE_COMPILATION_CONDITIONS, '"$(inherited) OTHER_FLAG"');
});

test("los App Intents y el provider compilan en módulos separados", {
  skip: process.platform !== "darwin" && "Requiere Xcode y el SDK iOS",
}, async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-intents-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const run = (args) => {
    const result = spawnSync("xcrun", args, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
    assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
    return result.stdout.trim();
  };
  const original = fs.readFileSync(path.join(__dirname, "../modules/vidkar-mcp/ios/VidkarMCPModule.swift"), "utf8");
  // Aislar solo el bridge Expo: los intents, entidades y transporte se compilan sin mocks.
  const bridgeStart = original.indexOf("public final class VidkarMCPModule: Module {");
  const bridgeEnd = original.indexOf("@available(iOS 17.0, *)\npublic struct VidkarMCPAppIntentsPackage", bridgeStart);
  assert.ok(bridgeStart > 0 && bridgeEnd > bridgeStart, "Debe localizarse el bridge Expo");
  const source = (original.slice(0, bridgeStart) + original.slice(bridgeEnd))
    .replace("import ExpoModulesCore\n", "");
  const modulePath = path.join(directory, "VidkarMCP.swift");
  fs.writeFileSync(modulePath, source);
  const helpers = ["MCPQueryPolicy.swift", "MCPNaturalLanguagePlanner.swift", "MCPInAppSearch.swift", "MCPCatalogQuery.swift", "MCPUserSnippet.swift"]
    .map((name) => path.join(__dirname, "../modules/vidkar-mcp/ios", name));

  const appDirectory = path.join(directory, "Vidkar");
  fs.mkdirSync(appDirectory);
  const appDelegatePath = path.join(appDirectory, "AppDelegate.swift");
  fs.writeFileSync(appDelegatePath, "import Foundation\n");
  const config = withVidkarAppIntents({ name: "Vidkar", slug: "vidkar" });
  await config.mods.ios.dangerous({
    ...config,
    modRequest: { platformProjectRoot: directory },
    modResults: {},
  });
  const generated = fs.readFileSync(appDelegatePath, "utf8");
  await config.mods.ios.dangerous({ ...config, modRequest: { platformProjectRoot: directory }, modResults: {} });
  assert.equal(fs.readFileSync(appDelegatePath, "utf8"), generated, "El generador debe ser idempotente");
  assert.equal((generated.match(/struct VidkarAppShortcutsProvider/g) || []).length, 1);
  for (const [sdkName, target] of [
    ["iphonesimulator", `${process.arch === "arm64" ? "arm64" : "x86_64"}-apple-ios16.4-simulator`],
    ["iphoneos", "arm64-apple-ios16.4"],
  ]) {
    await t.test(sdkName, () => {
      const sdk = run(["--sdk", sdkName, "--show-sdk-path"]);
      const outputDirectory = path.join(directory, sdkName);
      fs.mkdirSync(outputDirectory);
      // Compilar el camino estable con deployment target 16.4 y availability iOS 27.
      const flags = ["-sdk", sdk, "-target", target, "-swift-version", "5", "-O"];
      run(["swiftc", ...flags, "-whole-module-optimization", "-emit-module", "-emit-object", "-module-name", "VidkarMCP", modulePath, ...helpers,
        "-emit-module-path", path.join(outputDirectory, "VidkarMCP.swiftmodule"),
        "-o", path.join(outputDirectory, "VidkarMCP.o")]);
      run(["swiftc", ...flags, "-typecheck", "-module-name", "VidkarApp", "-I", outputDirectory, appDelegatePath]);
      const [major, minor] = run(["--sdk", sdkName, "--show-sdk-version"]).split(".").map(Number);
      if (major > 27 || (major === 27 && minor >= 3)) {
        const template = fs.readFileSync(path.join(__dirname, "../plugins/resources/vidkar-app-intents/SiriAIPreview.swift"), "utf8");
        const previewPath = path.join(outputDirectory, "SiriAIPreview.swift");
        const stable = generated.replace(/\n\/\/ VIDKAR_SIRI_AI_PREVIEW_BEGIN\n[\s\S]*?\n\/\/ VIDKAR_SIRI_AI_PREVIEW_END\n/, "");
        fs.writeFileSync(previewPath, `${stable}\n${template}`);
        run(["swiftc", ...flags, "-D", "VIDKAR_SIRI_AI_PREVIEW", "-typecheck", "-module-name", "VidkarApp", "-I", outputDirectory, previewPath]);
      }
      // El prototipo restante sigue compilando solo mediante opt-in explícito.
      run(["swiftc", ...flags, "-D", "VIDKAR_EXPERIMENTAL_NATURAL_LANGUAGE", "-typecheck", modulePath, ...helpers]);
    });
  }
});
