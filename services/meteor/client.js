import Meteor from "@meteorrn/core";
import { getHlsServerUrl, getMeteorUrl, normalizeMeteorUrl } from "../appUrls";

export { getHlsServerUrl, getMeteorUrl };

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
