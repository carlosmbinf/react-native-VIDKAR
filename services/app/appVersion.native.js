import * as Application from "expo-application";
import Constants from "expo-constants";
import { Platform } from "react-native";

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

const parseVersion = (value) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return null;
  }

  return normalized;
};

export const getAppVersionInfo = () => {
  const expoConfig = resolveExpoConfig();
  const nativeVersion = parseVersion(Application.nativeApplicationVersion);
  const configVersion = parseVersion(expoConfig?.version);
  const nativeBuildNumber = parseBuildNumber(Application.nativeBuildVersion);
  const platformBuildNumber =
    Platform.OS === "android"
      ? parseBuildNumber(expoConfig?.android?.versionCode)
      : parseBuildNumber(expoConfig?.ios?.buildNumber);

  return {
    version: nativeVersion || configVersion || "0.0.0",
    buildNumber: nativeBuildNumber || platformBuildNumber || "0",
  };
};

export default getAppVersionInfo;
