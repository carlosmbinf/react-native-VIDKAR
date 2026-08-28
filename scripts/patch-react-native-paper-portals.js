/* global __dirname */

const fs = require("fs");
const path = require("path");

const paperRoot = path.join(__dirname, "..", "node_modules", "react-native-paper");
const targets = [
  path.join(paperRoot, "src", "components", "Portal", "PortalManager.tsx"),
  path.join(paperRoot, "lib", "module", "components", "Portal", "PortalManager.js"),
  path.join(paperRoot, "lib", "commonjs", "components", "Portal", "PortalManager.js"),
];
const menuTargets = [
  path.join(paperRoot, "src", "components", "Menu", "Menu.tsx"),
  path.join(paperRoot, "lib", "module", "components", "Menu", "Menu.js"),
  path.join(paperRoot, "lib", "commonjs", "components", "Menu", "Menu.js"),
];

const portalReplacements = [
  ["style={[StyleSheet.absoluteFill, styles.portalLayer]}", "style={StyleSheet.absoluteFill}"],
  ["style: [StyleSheet.absoluteFill, styles.portalLayer]", "style: StyleSheet.absoluteFill"],
  ["style: [_reactNative.StyleSheet.absoluteFill, styles.portalLayer]", "style: _reactNative.StyleSheet.absoluteFill"],
];
const portalStyles = [
  /\nconst styles = StyleSheet\.create\(\{\n  portalLayer: \{[\s\S]*?\n\}\);\n?$/,
  /\nconst styles = _reactNative\.StyleSheet\.create\(\{\n  portalLayer: \{[\s\S]*?\n\}\);\n?$/,
];

let cleanedCount = 0;

for (const targetFile of targets) {
  if (!fs.existsSync(targetFile)) {
    console.warn(`[patch-react-native-paper-portals] No existe ${targetFile}.`);
    continue;
  }

  const originalContent = fs.readFileSync(targetFile, "utf8");
  let nextContent = originalContent;
  for (const [needle, replacement] of portalReplacements) {
    nextContent = nextContent.replace(needle, replacement);
  }
  for (const stylePattern of portalStyles) {
    nextContent = nextContent.replace(stylePattern, "\n");
  }
  if (nextContent === originalContent) continue;
  fs.writeFileSync(targetFile, nextContent, "utf8");
  cleanedCount += 1;
}

console.log(
  cleanedCount
    ? `[patch-react-native-paper-portals] Capas nativas normalizadas en ${cleanedCount} archivos.`
    : "[patch-react-native-paper-portals] Capas nativas ya normalizadas.",
);

const menuReplacements = [
  ["style={[styles.pressableOverlay, styles.portalOverlay]}", "style={styles.pressableOverlay}"],
  ["style: [styles.pressableOverlay, styles.portalOverlay]", "style: styles.pressableOverlay"],
  ["style={[styles.wrapper, styles.portalMenu, positionStyle, style]}", "style={[styles.wrapper, positionStyle, style]}"],
  ["style: [styles.wrapper, styles.portalMenu, positionStyle, style]", "style: [styles.wrapper, positionStyle, style]"],
];
const menuStyles = /\n  portalOverlay: \{[\s\S]*?\n  \},\n  portalMenu: \{[\s\S]*?\n  \},\n/;

for (const targetFile of menuTargets) {
  if (!fs.existsSync(targetFile)) continue;
  const originalContent = fs.readFileSync(targetFile, "utf8");
  let nextContent = originalContent;
  for (const [needle, replacement] of menuReplacements) {
    nextContent = nextContent.replace(needle, replacement);
  }
  nextContent = nextContent.replace(menuStyles, "\n");
  if (nextContent === originalContent) continue;
  fs.writeFileSync(targetFile, nextContent, "utf8");
  cleanedCount += 1;
}
