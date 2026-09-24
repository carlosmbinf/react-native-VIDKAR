const fs = require("fs");
const path = require("path");
const { createRunOncePlugin, withDangerousMod, withXcodeProject } = require("@expo/config-plugins");

const pkg = {
  name: "with-vidkar-watch-app-icon",
  version: "1.0.0",
};

const patchWatchIcon = (config) => {
  const relativeIconPath = path.join(
    "targets",
    "VidkarWatch",
    "Assets.xcassets",
    "AppIcon.appiconset",
    "Contents.json",
  );
  const candidates = [
    path.join(config.modRequest.projectRoot, relativeIconPath),
    path.join(config.modRequest.platformProjectRoot, "..", relativeIconPath),
  ];
  const iconContentsPath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!iconContentsPath) return config;

  const contents = JSON.parse(fs.readFileSync(iconContentsPath, "utf8"));
  contents.images = (contents.images || []).map((image) => ({
    ...image,
    idiom: "watch-marketing",
    size: "1024x1024",
    scale: "1x",
    platform: undefined,
  }));
  fs.writeFileSync(iconContentsPath, `${JSON.stringify(contents, null, 2)}\n`);
  return config;
};

const withVidkarWatchAppIcon = (config) => {
  config = withDangerousMod(config, ["ios", patchWatchIcon]);
  return withXcodeProject(config, (config) => patchWatchIcon(config));
};

module.exports = createRunOncePlugin(
  withVidkarWatchAppIcon,
  pkg.name,
  pkg.version,
);
