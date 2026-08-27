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

const sourceNeedle = "style={StyleSheet.absoluteFill}";
const sourceReplacement = "style={[StyleSheet.absoluteFill, styles.portalLayer]}";
const compiledNeedle = "style: StyleSheet.absoluteFill";
const compiledReplacement = "style: [StyleSheet.absoluteFill, styles.portalLayer]";
const commonJsNeedle = "style: _reactNative.StyleSheet.absoluteFill";
const commonJsReplacement =
  "style: [_reactNative.StyleSheet.absoluteFill, styles.portalLayer]";
const sourceStyles = `\nconst styles = StyleSheet.create({\n  portalLayer: {\n    elevation: 10000,\n    zIndex: 10000,\n  },\n});\n`;
const compiledStyles = `\nconst styles = StyleSheet.create({\n  portalLayer: {\n    elevation: 10000,\n    zIndex: 10000\n  }\n});\n`;
const commonJsStyles = `\nconst styles = _reactNative.StyleSheet.create({\n  portalLayer: {\n    elevation: 10000,\n    zIndex: 10000\n  }\n});\n`;

let patchedCount = 0;

for (const targetFile of targets) {
  if (!fs.existsSync(targetFile)) {
    console.warn(`[patch-react-native-paper-portals] No existe ${targetFile}.`);
    continue;
  }

  const originalContent = fs.readFileSync(targetFile, "utf8");
  if (originalContent.includes("portalLayer")) {
    continue;
  }

  const isSource = targetFile.endsWith(".tsx");
  const isCommonJs = targetFile.includes(`${path.sep}commonjs${path.sep}`);
  const needle = isSource
    ? sourceNeedle
    : isCommonJs
      ? commonJsNeedle
      : compiledNeedle;
  const replacement = isSource
    ? sourceReplacement
    : isCommonJs
      ? commonJsReplacement
      : compiledReplacement;
  const styles = isSource
    ? sourceStyles
    : isCommonJs
      ? commonJsStyles
      : compiledStyles;

  if (!originalContent.includes(needle)) {
    console.warn(`[patch-react-native-paper-portals] No se encontró el bloque esperado en ${targetFile}.`);
    continue;
  }

  const nextContent = originalContent.replace(needle, replacement) + styles;
  fs.writeFileSync(targetFile, nextContent, "utf8");
  patchedCount += 1;
}

console.log(
  patchedCount
    ? `[patch-react-native-paper-portals] Parche aplicado en ${patchedCount} archivos.`
    : "[patch-react-native-paper-portals] Parche ya aplicado.",
);

const menuReplacements = [
  ["style={styles.pressableOverlay}", "style={[styles.pressableOverlay, styles.portalOverlay]}"],
  ["style: styles.pressableOverlay", "style: [styles.pressableOverlay, styles.portalOverlay]"],
  ["style={[styles.wrapper, positionStyle, style]}", "style={[styles.wrapper, styles.portalMenu, positionStyle, style]}"],
  ["style: [styles.wrapper, positionStyle, style]", "style: [styles.wrapper, styles.portalMenu, positionStyle, style]"],
];
const menuStyles = `
  portalOverlay: {
    elevation: 10000,
    zIndex: 10000,
  },
  portalMenu: {
    elevation: 10001,
    zIndex: 10001,
  },
`;

for (const targetFile of menuTargets) {
  if (!fs.existsSync(targetFile)) continue;
  const originalContent = fs.readFileSync(targetFile, "utf8");
  if (originalContent.includes("portalOverlay")) continue;

  let nextContent = originalContent;
  for (const [needle, replacement] of menuReplacements) {
    nextContent = nextContent.replace(needle, replacement);
  }
  if (nextContent === originalContent) {
    console.warn(`[patch-react-native-paper-portals] No se encontró el bloque Menu esperado en ${targetFile}.`);
    continue;
  }

  const marker = targetFile.endsWith(".tsx")
    ? "  pressableOverlay: {"
    : "pressableOverlay: {";
  const markerIndex = nextContent.indexOf(marker);
  const closingIndex = nextContent.indexOf(targetFile.endsWith(".tsx") ? "\n  }," : "\n  }", markerIndex);
  if (markerIndex === -1 || closingIndex === -1) continue;
  const insertion = targetFile.endsWith(".tsx") ? closingIndex + 5 : closingIndex + 4;
  const separator = targetFile.endsWith(".tsx") ? "" : ",";
  nextContent = `${nextContent.slice(0, insertion)}${separator}\n${menuStyles}${nextContent.slice(insertion)}`;
  fs.writeFileSync(targetFile, nextContent, "utf8");
  console.log(`[patch-react-native-paper-portals] Menu parcheado en ${targetFile}.`);
}
