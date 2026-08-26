import { Platform } from "react-native";

const APP_GROUP = "group.com.vidkar.shared";
const STORAGE_KEY = "vidkar.consumption.widget.v1";

let storage;
try {
  // @bacons/apple-targets provides a no-op fallback when the native module is absent.
  const { ExtensionStorage } = require("@bacons/apple-targets");
  storage = new ExtensionStorage(APP_GROUP);
} catch {
  storage = null;
}

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const isUnlimited = (enabled, flag, date) =>
  enabled === true &&
  (flag === true || (date && new Date(date).getTime() > Date.now()));

export const syncConsumptionWidget = (user) => {
  if (Platform.OS !== "ios" || !storage) {
    return false;
  }

  if (!user?._id) {
    storage.remove(STORAGE_KEY);
    const { ExtensionStorage } = require("@bacons/apple-targets");
    ExtensionStorage.reloadWidget("VidkarConsumptionWidget");
    return true;
  }

  const proxyEnabled = user.baneado === false;
  const vpnEnabled = user.vpn === true;
  const snapshot = {
    username: user.username || user.profile?.firstName || null,
    updatedAt: new Date().toISOString(),
    proxy: {
      enabled: proxyEnabled,
      usedMB: toNumber(user.megasGastadosinBytes) / 1048576,
      limitMB: toNumber(user.megas),
      unlimited: isUnlimited(proxyEnabled, user.isIlimitado, user.fechaSubscripcion),
    },
    vpn: {
      enabled: vpnEnabled,
      usedMB: toNumber(user.vpnMbGastados),
      limitMB: toNumber(user.vpnmegas),
      unlimited: isUnlimited(vpnEnabled, user.vpnisIlimitado, user.vpnfechaSubscripcion),
    },
  };

  storage.set(STORAGE_KEY, snapshot);
  const { ExtensionStorage } = require("@bacons/apple-targets");
  ExtensionStorage.reloadWidget("VidkarConsumptionWidget");
  return true;
};
