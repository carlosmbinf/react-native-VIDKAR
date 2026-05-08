/* global __dirname */

const fs = require("fs");
const path = require("path");

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