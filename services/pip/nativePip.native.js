import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

const NativeVidkarPip = requireOptionalNativeModule("VidkarPip");

export const isNativePipAvailable = () => Platform.OS === "android" && Boolean(NativeVidkarPip);

export const setNativePipPlayerActive = async (active) => {
  if (!isNativePipAvailable()) {
    return { supported: false, playerActive: false, inPictureInPicture: false };
  }

  try {
    return await NativeVidkarPip.setPlayerActive(Boolean(active));
  } catch (_error) {
    return { supported: false, playerActive: false, inPictureInPicture: false };
  }
};

export const getNativePipStatus = async () => {
  if (!isNativePipAvailable()) {
    return { supported: false, playerActive: false, inPictureInPicture: false };
  }

  try {
    return await NativeVidkarPip.getStatus();
  } catch (_error) {
    return { supported: false, playerActive: false, inPictureInPicture: false };
  }
};
