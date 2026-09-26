const fs = require("node:fs");
const { Buffer } = require("node:buffer");

// Solo para builds locales síncronos: Xcode recibe las versiones del xcconfig.
// No cambia app.json ni firma; el plist original se restaura byte por byte.
function withLocalIOSVersion(plistPath, backupPath, build) {
  const original = fs.readFileSync(plistPath);
  let patched = original.toString("utf8");
  for (const [key, variable] of [
    ["CFBundleVersion", "CURRENT_PROJECT_VERSION"],
    ["CFBundleShortVersionString", "MARKETING_VERSION"],
  ]) {
    const pattern = new RegExp(`(<key>${key}</key>\\s*<string>)[^<]*(</string>)`, "g");
    if ([...patched.matchAll(pattern)].length !== 1) {
      throw new Error(`Plist no reconocido: se requiere una única clave ${key}.`);
    }
    patched = patched.replace(pattern, (_, start, end) => `${start}$(${variable})${end}`);
  }
  // Copia recuperable adicional; nunca reemplazar un respaldo anterior.
  fs.writeFileSync(backupPath, original, { flag: "wx", mode: 0o600 });
  const temporary = Buffer.from(patched);
  fs.writeFileSync(plistPath, temporary);
  try {
    return build();
  } finally {
    if (!fs.readFileSync(plistPath).equals(temporary)) {
      throw new Error("El plist cambió durante el build; se conserva la edición concurrente y el respaldo original.");
    }
    fs.writeFileSync(plistPath, original);
  }
}

module.exports = { withLocalIOSVersion };