const fs = require("fs");
const path = require("path");
const { createRunOncePlugin, withDangerousMod } = require("@expo/config-plugins");

const pkg = {
  name: "with-vidkar-xcode-object-version",
  version: "1.0.0",
};

const SUPPORTED_OBJECT_VERSION = "77";

const findProjectFile = (iosProjectRoot) => {
  if (!fs.existsSync(iosProjectRoot)) {
    return null;
  }

  const projectDir = fs
    .readdirSync(iosProjectRoot)
    .find((entry) => entry.endsWith(".xcodeproj"));

  if (!projectDir) {
    return null;
  }

  return path.join(iosProjectRoot, projectDir, "project.pbxproj");
};

const patchProjectFile = (projectFile) => {
  if (!projectFile || !fs.existsSync(projectFile)) {
    return;
  }

  const source = fs.readFileSync(projectFile, "utf8");
  const nextSource = source.replace(
    /objectVersion = 70;/,
    `objectVersion = ${SUPPORTED_OBJECT_VERSION};`,
  );

  if (nextSource !== source) {
    fs.writeFileSync(projectFile, nextSource);
    console.log(`[with-vidkar-xcode-object-version] objectVersion 70 -> ${SUPPORTED_OBJECT_VERSION}`);
  }
};

const withVidkarXcodeObjectVersion = (config) => {
  return withDangerousMod(config, [
    "ios",
    (dangerousConfig) => {
      const projectFile = findProjectFile(dangerousConfig.modRequest.platformProjectRoot);
      patchProjectFile(projectFile);
      return dangerousConfig;
    },
  ]);
};

module.exports = createRunOncePlugin(
  withVidkarXcodeObjectVersion,
  pkg.name,
  pkg.version,
);