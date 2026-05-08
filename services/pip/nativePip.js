export const isNativePipAvailable = () => false;

export const setNativePipPlayerActive = async () => ({
  supported: false,
  playerActive: false,
  inPictureInPicture: false,
});

export const getNativePipStatus = async () => ({
  supported: false,
  playerActive: false,
  inPictureInPicture: false,
});
