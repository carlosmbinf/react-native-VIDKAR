import Meteor from "@meteorrn/core";
import * as SecureStore from "expo-secure-store";
import { getHlsServerUrl, getMeteorUrl, normalizeMeteorUrl } from "../appUrls";

export { getHlsServerUrl, getMeteorUrl };

const meteorAsyncStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export async function connectToMeteor(endpoint) {
  const resolvedEndpoint = normalizeMeteorUrl(endpoint) || getMeteorUrl();

  if (!resolvedEndpoint) {
    throw new Error("Meteor URL no configurada en app.json");
  }

  await Meteor.connect(resolvedEndpoint, {
    AsyncStorage: meteorAsyncStorage,
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

let sessionBootstrap = null;

// connect() no espera el handshake ni _loadInitialUser(). Meteor restaura su
// token desde meteorAsyncStorage; aquí solo esperamos, sin inventar un login.
export function ensureMeteorSession() {
  if (sessionBootstrap) return sessionBootstrap;
  sessionBootstrap = (async () => {
    if (!Meteor.status()?.hasDdp) await ensureMeteorConnection();
    else if (!Meteor.status()?.connected) Meteor.reconnect();
    return new Promise((resolve, reject) => {
      const data = Meteor.getData();
      const finish = (error) => {
        clearTimeout(timer);
        data.offChange(check);
        if (error) reject(error);
        else resolve(Meteor.userId());
      };
      const check = () => {
        if (Meteor.status()?.connected && Meteor.loggingIn() === false && !Meteor.loggingOut()
          && (Meteor.userId() || !Meteor.getAuthToken())) finish();
      };
      const timer = setTimeout(() => finish(new Error("No se pudo restaurar la sesión. Comprueba la conexión y reintenta.")), 15000);
      data.onChange(check);
      check();
    });
  })().finally(() => { sessionBootstrap = null; });
  return sessionBootstrap;
}

export { meteorAsyncStorage, Meteor };
