/* global __dirname */

const fs = require("fs");
const path = require("path");

const xcodeChangesPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "@bacons",
  "apple-targets",
  "build",
  "with-xcode-changes.js",
);

const configurationListPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "@bacons",
  "apple-targets",
  "build",
  "configuration-list.js",
);

if (!fs.existsSync(xcodeChangesPath) || !fs.existsSync(configurationListPath)) {
  console.warn("[patch-apple-targets-watch-prebuild] apple-targets no esta instalado; se omite el parche.");
  process.exit(0);
}

const patchXcodeChanges = () => {
  const source = fs.readFileSync(xcodeChangesPath, "utf8");

  const patchedBlock = `        // Remove existing build phases
        const existingBuildConfigurationList = targetToUpdate.props.buildConfigurationList;
        const nextBuildConfigurationList = (0, configuration_list_1.createConfigurationListForType)(project, props);
        if (existingBuildConfigurationList?.props?.buildConfigurations) {
            existingBuildConfigurationList.props.buildConfigurations
                .filter(Boolean)
                .forEach((config) => {
                config.getReferrers?.().forEach((ref) => {
                    ref.removeReference(config.uuid);
                });
                config.removeFromProject?.();
            });
        }
        // Remove existing build configuration list
        existingBuildConfigurationList?.getReferrers?.().forEach((ref) => {
            ref.removeReference(existingBuildConfigurationList.uuid);
        });
        existingBuildConfigurationList?.removeFromProject?.();
        // Create new build phases
        targetToUpdate.props.buildConfigurationList = nextBuildConfigurationList;`;

  if (source.includes("nextBuildConfigurationList")) {
    return false;
  }

  const originalRegex = /        \/\/ Remove existing build phases\n        targetToUpdate\.props\.buildConfigurationList\.props\.buildConfigurations\.forEach\(\(config\) => \{\n            config\.getReferrers\(\)\.forEach\(\(ref\) => \{\n                ref\.removeReference\(config\.uuid\);\n            \}\);\n            config\.removeFromProject\(\);\n        \}\);\n        \/\/ Remove existing build configuration list\n        targetToUpdate\.props\.buildConfigurationList\n            \.getReferrers\(\)\n            \.forEach\(\(ref\) => \{\n            ref\.removeReference\(targetToUpdate\.props\.buildConfigurationList\.uuid\);\n        \}\);\n        targetToUpdate\.props\.buildConfigurationList\.removeFromProject\(\);\n        \/\/ Create new build phases\n        targetToUpdate\.props\.buildConfigurationList =\n            \(0, configuration_list_1\.createConfigurationListForType\)\(project, props\);/;

  const nextSource = source.replace(originalRegex, patchedBlock);

  if (nextSource === source) {
    console.warn("[patch-apple-targets-watch-prebuild] No se encontro el bloque de update esperado; revisar version de @bacons/apple-targets.");
    return false;
  }

  fs.writeFileSync(xcodeChangesPath, nextSource);
  return true;
};

const patchWatchSigning = () => {
  const source = fs.readFileSync(configurationListPath, "utf8");

  const functionMatch = source.match(/function createWatchAppConfigurationList[\s\S]*?\n}\nfunction /);

  if (!functionMatch) {
    console.warn("[patch-apple-targets-watch-prebuild] No se encontro createWatchAppConfigurationList; revisar version de @bacons/apple-targets.");
    return false;
  }

  const originalFunction = functionMatch[0];
  let nextFunction = originalFunction
    .replace(/\n\s+CODE_SIGN_IDENTITY: "Apple (Development|Distribution)",/g, "")
    .replace(/\n\s+"CODE_SIGN_IDENTITY\[sdk=watchos\*\]": "Apple (Development|Distribution)",/g, "")
    .replace(/\n\s+DEVELOPMENT_TEAM: "4TWB6RN383",/g, "")
    .replace(/\n\s+PROVISIONING_PROFILE_SPECIFIER: "",/g, "");

  nextFunction = nextFunction.replace(
    /(debug: \{\n\s+\.\.\.common,)/,
    `$1\n            CODE_SIGN_IDENTITY: "Apple Development",\n            "CODE_SIGN_IDENTITY[sdk=watchos*]": "Apple Development",\n            DEVELOPMENT_TEAM: "4TWB6RN383",\n            PROVISIONING_PROFILE_SPECIFIER: "",`,
  );

  nextFunction = nextFunction.replace(
    /(release: \{\n\s+\.\.\.common,)/,
    `$1\n            CODE_SIGN_IDENTITY: "Apple Development",\n            DEVELOPMENT_TEAM: "4TWB6RN383",\n            PROVISIONING_PROFILE_SPECIFIER: "",`,
  );

  if (
    !nextFunction.includes('"CODE_SIGN_IDENTITY[sdk=watchos*]": "Apple Development"') ||
    !nextFunction.includes('CODE_SIGN_IDENTITY: "Apple Development"') ||
    nextFunction.includes('"CODE_SIGN_IDENTITY[sdk=watchos*]": "Apple Distribution"') ||
    nextFunction.includes('CODE_SIGN_IDENTITY: "Apple Distribution"')
  ) {
    console.warn("[patch-apple-targets-watch-prebuild] No se pudieron insertar los signing identities del Watch.");
    return false;
  }

  const nextSource = source.replace(originalFunction, nextFunction);

  if (nextSource === source) {
    console.log("[patch-apple-targets-watch-prebuild] Signing del Watch ya esta alineado.");
    return false;
  }

  fs.writeFileSync(configurationListPath, nextSource);
  return true;
};

const changedXcodeChanges = patchXcodeChanges();
const changedWatchSigning = patchWatchSigning();

if (changedXcodeChanges || changedWatchSigning) {
  console.log("[patch-apple-targets-watch-prebuild] Parche aplicado.");
} else {
  console.log("[patch-apple-targets-watch-prebuild] Parche ya aplicado.");
}
