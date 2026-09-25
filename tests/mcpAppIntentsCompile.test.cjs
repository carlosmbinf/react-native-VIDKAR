const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const withVidkarAppIntents = require("../plugins/with-vidkar-app-intents");

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
  const helpers = ["MCPQueryPolicy.swift", "MCPNaturalLanguagePlanner.swift"]
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
  for (const [sdkName, target] of [
    ["iphonesimulator", `${process.arch === "arm64" ? "arm64" : "x86_64"}-apple-ios16.4-simulator`],
    ["iphoneos", "arm64-apple-ios16.4"],
  ]) {
    await t.test(sdkName, () => {
      const sdk = run(["--sdk", sdkName, "--show-sdk-path"]);
      const outputDirectory = path.join(directory, sdkName);
      fs.mkdirSync(outputDirectory);
      // Compilar el prototipo explícitamente sin activarlo en el binario de producción.
      const flags = ["-sdk", sdk, "-target", target, "-swift-version", "5", "-O", "-D", "VIDKAR_EXPERIMENTAL_NATURAL_LANGUAGE"];
      run(["swiftc", ...flags, "-whole-module-optimization", "-emit-module", "-emit-object", "-module-name", "VidkarMCP", modulePath, ...helpers,
        "-emit-module-path", path.join(outputDirectory, "VidkarMCP.swiftmodule"),
        "-o", path.join(outputDirectory, "VidkarMCP.o")]);
      run(["swiftc", ...flags, "-typecheck", "-module-name", "VidkarApp", "-I", outputDirectory, appDelegatePath]);
    });
  }
});