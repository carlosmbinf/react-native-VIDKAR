import Constants from "expo-constants";

const resolveExpoConfig = () => {
  return (
    Constants.expoConfig ??
    Constants.manifest2?.extra?.expoClient ??
    Constants.manifest ??
    null
  );
};

const parseBuildNumber = (value) => {
  const normalized = String(value ?? "").trim();

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  return normalized;
};

export const getAppVersionInfo = () => {
  const expoConfig = resolveExpoConfig();
  const version = String(expoConfig?.version || "0.0.0");
  const buildNumber =
    parseBuildNumber(expoConfig?.android?.versionCode) ||
    parseBuildNumber(expoConfig?.ios?.buildNumber) ||
    "0";

  return {
    version,
    buildNumber,
  };
};

export default getAppVersionInfo;
