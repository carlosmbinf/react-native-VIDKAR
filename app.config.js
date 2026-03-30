const staticAppConfig = require("./app.json").expo;

function getVersionBase(version) {
  const [major = "1", minor = "0"] = String(version || "1.0.0").split(".");
  return `${major}.${minor}`;
}

function getFallbackPatch(config) {
  const versionParts = String(config.version || "").split(".");
  const currentPatch = versionParts[2];

  if (/^\d+$/.test(currentPatch || "")) {
    return currentPatch;
  }

  if (/^\d+$/.test(String(config.ios?.buildNumber || ""))) {
    return String(config.ios.buildNumber);
  }

  if (Number.isInteger(config.android?.versionCode)) {
    return String(config.android.versionCode);
  }

  return "0";
}

module.exports = () => {
  const versionBase =
    process.env.APP_VERSION_BASE || getVersionBase(staticAppConfig.version);
  const versionPatch =
    process.env.APP_VERSION_PATCH || getFallbackPatch(staticAppConfig);

  return {
    ...staticAppConfig,
    version: `${versionBase}.${versionPatch}`,
    plugins: [
      ...staticAppConfig.plugins,
      [
        "@pksung1/expo-store-signing",
        {
          storeFile: process.env.CM_KEYSTORE_PATH,
          storePassword: process.env.CM_KEYSTORE_PASSWORD,
          keyAlias: process.env.CM_KEY_ALIAS,
          keyPassword: process.env.CM_KEY_PASSWORD,
        },
      ],
    ],
  };
};
