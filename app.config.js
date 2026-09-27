const staticAppConfig = require("./app.json").expo;
const { resolvePublicUrls } = require("./config/publicUrls");

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

module.exports = ({ config } = {}) => {
  const appConfig = {
    ...staticAppConfig,
    ...config,
  };
  const publicUrls = resolvePublicUrls(process.env, appConfig.extra);
  const configuredHost = new URL(publicUrls.vidkarBaseUrl).hostname.toLowerCase();
  const isLocalHost = configuredHost === "localhost"
    || configuredHost.endsWith(".localhost")
    || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(configuredHost);
  const associatedDomains = new Set(appConfig.ios?.associatedDomains || []);
  if (!isLocalHost && new URL(publicUrls.vidkarBaseUrl).protocol === "https:") {
    associatedDomains.add(`applinks:${configuredHost}`);
  }
  const infoPlist = appConfig.ios?.infoPlist || {};
  const versionBase =
    process.env.APP_VERSION_BASE || getVersionBase(appConfig.version);
  const versionPatch =
    process.env.APP_VERSION_PATCH || getFallbackPatch(appConfig);

  return {
    ...appConfig,
    version: `${versionBase}.${versionPatch}`,
    extra: {
      ...appConfig.extra,
      ...publicUrls,
    },
    ios: {
      ...appConfig.ios,
      associatedDomains: [...associatedDomains],
      infoPlist: {
        ...infoPlist,
        VIDKAR_BASE_URL: publicUrls.vidkarBaseUrl,
      },
    },
    plugins: [
      ...appConfig.plugins,
      [
        "@pksung1/expo-store-signing",
        {
          storeFile: "/vidkar-android/my-release.jks",
          storePassword: process.env.CM_KEYSTORE_PASSWORD,
          keyAlias: process.env.CM_KEY_ALIAS,
          keyPassword: process.env.CM_KEY_PASSWORD,
        },
      ],
    ],
  };
};
