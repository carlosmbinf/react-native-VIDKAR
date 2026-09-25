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

const withVidkarAppIntents = (config) => withDangerousMod(config, ["ios", (config) => {
  const appDelegatePath = path.join(config.modRequest.platformProjectRoot, "Vidkar", "AppDelegate.swift");
  if (!fs.existsSync(appDelegatePath)) {
    throw new Error("No se encontró Vidkar/AppDelegate.swift para registrar App Intents.");
  }

  let source = fs.readFileSync(appDelegatePath, "utf8");
  for (const importLine of ["import AppIntents", "import VidkarMCP"]) {
    if (!source.includes(importLine)) source = `${importLine}\n${source}`;
  }
  if (!source.includes("VIDKAR_APP_INTENTS_PACKAGE")) {
    source = `${source.trimEnd()}\n${packageDeclaration}`;
  }
  fs.writeFileSync(appDelegatePath, source);
  return config;
}]);

module.exports = createRunOncePlugin(
  withVidkarAppIntents,
  pkg.name,
  pkg.version,
);
