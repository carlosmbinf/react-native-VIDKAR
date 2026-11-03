/**
 * ViewShot's width/height are bitmap pixels on Android, but iOS passes them
 * to UIGraphicsImageRenderer as points and applies the device scale again.
 */
export function getGenieCaptureSize(width, height, platform, pixelRatio = 1) {
  const scale = Math.min(2, 960 / width, 1440 / height);
  const outputWidth = Math.round(width * scale);
  const outputHeight = Math.round(height * scale);
  const rendererScale = platform === 'ios' && pixelRatio > 0 ? pixelRatio : 1;
  return {
    width: Math.max(1, Math.round(outputWidth / rendererScale)),
    height: Math.max(1, Math.round(outputHeight / rendererScale)),
  };
}
