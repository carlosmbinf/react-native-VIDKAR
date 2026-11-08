/* global __dirname */

const fs = require("fs");
const path = require("path");

const androidGradleFile = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-vlc-media-player",
  "android",
  "build.gradle"
);
const androidGradleContent = fs.readFileSync(androidGradleFile, "utf8");
const legacyProguard = /getDefaultProguardFile\(\s*(["'])proguard-android\.txt\1\s*\)/g;
const optimizedProguard = /getDefaultProguardFile\(\s*(["'])proguard-android-optimize\.txt\1\s*\)/;

if (legacyProguard.test(androidGradleContent)) {
  const patchedGradle = androidGradleContent.replace(
    legacyProguard,
    (match) => match.replace("proguard-android.txt", "proguard-android-optimize.txt")
  );
  fs.writeFileSync(androidGradleFile, patchedGradle, "utf8");
  console.log("[patch-vlc-media-player] Parche ProGuard para AGP 9 aplicado.");
} else if (optimizedProguard.test(androidGradleContent)) {
  console.log("[patch-vlc-media-player] Parche ProGuard ya aplicado.");
} else {
  throw new Error(
    "[patch-vlc-media-player] No se encontro getDefaultProguardFile esperado en android/build.gradle."
  );
}

const targetFile = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-vlc-media-player",
  "VLCPlayer.js"
);

const sourceNeedle = "const source = resolveAssetSource(this.props.source) || {};";
const sourceReplacement = `const resolvedSource = resolveAssetSource(this.props.source) || {};
    const source = {
      ...resolvedSource,
      initOptions: Array.isArray(resolvedSource.initOptions)
        ? [...resolvedSource.initOptions]
        : [],
    };`;

const initOptionsNeedle = "    source.initOptions = source.initOptions || [];\n\n";

if (!fs.existsSync(targetFile)) {
  console.warn("[patch-vlc-media-player] VLCPlayer.js no existe. Se omite el parche.");
  process.exit(0);
}

const originalContent = fs.readFileSync(targetFile, "utf8");

if (originalContent.includes("const resolvedSource = resolveAssetSource(this.props.source) || {};")) {
  console.log("[patch-vlc-media-player] Parche ya aplicado.");
  process.exit(0);
}

if (!originalContent.includes(sourceNeedle)) {
  console.warn("[patch-vlc-media-player] No se encontró el bloque source esperado.");
  process.exit(0);
}

let nextContent = originalContent.replace(sourceNeedle, sourceReplacement);
nextContent = nextContent.replace(initOptionsNeedle, "");

fs.writeFileSync(targetFile, nextContent, "utf8");
console.log("[patch-vlc-media-player] Parche aplicado correctamente.");