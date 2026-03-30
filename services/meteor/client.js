import Meteor from "@meteorrn/core";

const DEFAULT_METEOR_URL = "ws://www.vidkar.com:3000/websocket";

const webAsyncStorage = {
  async getItem(key) {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  },
};

function normalizeMeteorUrl(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

export function getMeteorUrl() {
  // const meteorUrlCandidates = [
  //   process.env.EXPO_PUBLIC_METEOR_URL,
  //   Constants.expoConfig?.extra?.meteorUrl,
  //   Constants.manifest2?.extra?.expoClient?.extra?.meteorUrl,
  //   Constants.manifest2?.extra?.meteorUrl,
  //   Constants.manifest?.extra?.meteorUrl,
  //   DEFAULT_METEOR_URL,
  // ];

  // for (const candidate of meteorUrlCandidates) {
  //   const normalizedMeteorUrl = normalizeMeteorUrl(candidate);
  //   if (normalizedMeteorUrl) {
  //     return normalizedMeteorUrl;
  //   }
  // }

  return DEFAULT_METEOR_URL || null;
}

export async function connectToMeteor(endpoint) {
  const resolvedEndpoint = normalizeMeteorUrl(endpoint) || getMeteorUrl();

  if (!resolvedEndpoint) {
    throw new Error("Meteor URL no configurada en app.json");
  }

  await Meteor.connect(resolvedEndpoint, {
    AsyncStorage: webAsyncStorage,
  });

  return true;
}

export async function ensureMeteorConnection() {
  const status = Meteor.status?.();
  if (status?.connected) {
    return true;
  }

  return connectToMeteor(getMeteorUrl());
}

export { webAsyncStorage as meteorAsyncStorage };

