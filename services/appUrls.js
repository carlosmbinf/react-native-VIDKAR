import Constants from "expo-constants";

const {
  buildMeteorUrlForHost,
  getMeteorHttpOrigin,
  getMeteorHost: getMeteorHostFromUrl,
  normalizeMeteorUrl,
  resolvePublicUrls,
} = require("../config/publicUrls");

const publicEnvironment = typeof process !== "undefined" ? {
  EXPO_PUBLIC_VIDKAR_BASE_URL: process.env.EXPO_PUBLIC_VIDKAR_BASE_URL,
  EXPO_PUBLIC_METEOR_URL: process.env.EXPO_PUBLIC_METEOR_URL,
  EXPO_PUBLIC_MCP_URL: process.env.EXPO_PUBLIC_MCP_URL,
  EXPO_PUBLIC_HLS_SERVER_URL: process.env.EXPO_PUBLIC_HLS_SERVER_URL,
} : {};

const getManifestExtra = () => Constants.expoConfig?.extra
  || Constants.manifest2?.extra?.expoClient?.extra
  || Constants.manifest2?.extra
  || Constants.manifest?.extra
  || {};

export const getPublicUrls = () => resolvePublicUrls(publicEnvironment, getManifestExtra());
export const getVidkarBaseUrl = () => getPublicUrls().vidkarBaseUrl;
export const getMeteorUrl = () => getPublicUrls().meteorUrl;
export const getMCPUrl = () => getPublicUrls().mcpServerUrl;
export const getHlsServerUrl = () => getPublicUrls().hlsServerUrl;
export { normalizeMeteorUrl };
export const getMeteorHost = () => getMeteorHostFromUrl(getMeteorUrl());
export const getMeteorHttpOriginForUrl = (url) => getMeteorHttpOrigin(url);
export const getMeteorHttpOriginUrl = () => getMeteorHttpOriginForUrl(getMeteorUrl());
export const getPrivacyPolicyUrl = () => `${getVidkarBaseUrl()}/politica-privacidad`;
export const buildManualMeteorUrl = (host) => buildMeteorUrlForHost(host, getMeteorUrl());
