const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { withLocalIOSVersion } = require("../scripts/with-local-ios-version.cjs");

const original = '<?xml version="1.0"?><plist><dict>\r\n\t<key>CFBundleVersion</key><string>100</string>\r\n<key>CFBundleShortVersionString</key><string>1.0.0</string><key>Other</key><string>preserved</string></dict></plist>\n';
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-local-version-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "Info.plist");
  const backup = path.join(directory, "original.plist");
  fs.writeFileSync(file, original);
  return { file, backup };
}

test("override local usa xcconfig y restaura bytes, formato y copia completa", (t) => {
  const { file, backup } = fixture(t);
  const result = withLocalIOSVersion(file, backup, () => {
    const current = fs.readFileSync(file, "utf8");
    assert.equal(current, original.replace(">100<", ">$(CURRENT_PROJECT_VERSION)<").replace(">1.0.0<", ">$(MARKETING_VERSION)<"));
    assert.equal(fs.readFileSync(backup, "utf8"), original);
    return 0;
  });
  assert.equal(result, 0);
  assert.equal(fs.readFileSync(file, "utf8"), original);
});

test("restaura también ante error o código de build fallido", (t) => {
  for (const throws of [false, true]) {
    const { file, backup } = fixture(t);
    const run = () => withLocalIOSVersion(file, backup, () => {
      if (throws) throw new Error("build failed");
      return 65;
    });
    if (throws) assert.throws(run, /build failed/);
    else assert.equal(run(), 65);
    assert.equal(fs.readFileSync(file, "utf8"), original);
  }
});

test("rechaza claves ausentes o duplicadas sin modificar archivos", (t) => {
  for (const input of [original.replace("CFBundleVersion", "OtherVersion"), original + "<key>CFBundleVersion</key><string>200</string>"]) {
    const { file, backup } = fixture(t);
    fs.writeFileSync(file, input);
    assert.throws(() => withLocalIOSVersion(file, backup, () => assert.fail()), /Plist no reconocido/);
    assert.equal(fs.readFileSync(file, "utf8"), input);
    assert.equal(fs.existsSync(backup), false);
  }
});

test("nunca reemplaza una copia recuperable existente", (t) => {
  const { file, backup } = fixture(t);
  fs.writeFileSync(backup, "previous backup");
  assert.throws(() => withLocalIOSVersion(file, backup, () => assert.fail()), /EEXIST/);
  assert.equal(fs.readFileSync(file, "utf8"), original);
  assert.equal(fs.readFileSync(backup, "utf8"), "previous backup");
});

test("conserva ediciones concurrentes y respaldo en lugar de sobrescribirlas", (t) => {
  const { file, backup } = fixture(t);
  assert.throws(() => withLocalIOSVersion(file, backup, () => {
    fs.writeFileSync(file, "concurrent edit");
  }), /edición concurrente/);
  assert.equal(fs.readFileSync(file, "utf8"), "concurrent edit");
  assert.equal(fs.readFileSync(backup, "utf8"), original);
});