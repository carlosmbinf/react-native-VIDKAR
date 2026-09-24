const fs = require("fs");
const path = require("path");
const {
  createRunOncePlugin,
  withDangerousMod,
  withXcodeProject,
} = require("@expo/config-plugins");

const pkg = {
  name: "with-vidkar-app-intents",
  version: "1.0.0",
};

const hostPackageSource = `import AppIntents
import VidkarMCP

@available(iOS 17.0, *)
struct VidkarAppIntentsPackage: AppIntentsPackage {
  static var includedPackages: [any AppIntentsPackage.Type] {
    [VidkarMCPIntentsPackage.self]
  }
}
`;

const withHostPackageFile = (config) => withDangerousMod(config, ["ios", (config) => {
  const filePath = path.join(
    config.modRequest.platformProjectRoot,
    "Vidkar",
    "VidkarAppIntentsPackage.swift",
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, hostPackageSource);
  return config;
}]);

const withHostPackageSource = (config) => withXcodeProject(config, (config) => {
  const project = config.modResults;
  const target = project.getFirstTarget().uuid;
  const sourcePath = "Vidkar/VidkarAppIntentsPackage.swift";
  const appGroup = project.findPBXGroupKey({ name: "Vidkar" });

  if (!appGroup) {
    throw new Error("No se encontró el grupo Vidkar para registrar AppIntentsPackage.");
  }
  if (!project.hasFile(sourcePath)) {
    project.addSourceFile(sourcePath, { target }, appGroup);
  }

  return config;
});

const withVidkarAppIntents = (config) => {
  config = withHostPackageFile(config);
  return withHostPackageSource(config);
};

module.exports = createRunOncePlugin(
  withVidkarAppIntents,
  pkg.name,
  pkg.version,
);
