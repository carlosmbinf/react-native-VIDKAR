/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const legacyGradle = `android {
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}`;
const optimizedGradle = legacyGradle.replace(
  "proguard-android.txt",
  "proguard-android-optimize.txt"
);
const patchedPlayer = "const resolvedSource = resolveAssetSource(this.props.source) || {};";

function fixture(t, gradle = legacyGradle, player = patchedPlayer) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-vlc-gradle-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const scripts = path.join(root, "scripts");
  const vlc = path.join(root, "node_modules", "react-native-vlc-media-player");
  fs.mkdirSync(scripts, { recursive: true });
  fs.mkdirSync(path.join(vlc, "android"), { recursive: true });
  const script = path.join(scripts, "patch-vlc-media-player.js");
  fs.copyFileSync(path.join(projectRoot, "scripts", "patch-vlc-media-player.js"), script);
  const gradleFile = path.join(vlc, "android", "build.gradle");
  if (gradle !== null) fs.writeFileSync(gradleFile, gradle);
  const playerFile = path.join(vlc, "VLCPlayer.js");
  fs.writeFileSync(playerFile, player);
  return {
    gradleFile,
    playerFile,
    run: () => spawnSync(process.execPath, [script], { encoding: "utf8" }),
  };
}

test("corrige el Gradle de VLC aunque el parche JavaScript ya este aplicado", (t) => {
  const currentGradle = fs.readFileSync(
    path.join(projectRoot, "node_modules", "react-native-vlc-media-player", "android", "build.gradle"),
    "utf8"
  );
  const input = currentGradle.replaceAll("proguard-android-optimize.txt", "proguard-android.txt");
  const files = fixture(t, input);
  const result = files.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    fs.readFileSync(files.gradleFile, "utf8"),
    input.replaceAll("proguard-android.txt", "proguard-android-optimize.txt")
  );
  assert.equal(fs.readFileSync(files.playerFile, "utf8"), patchedPlayer);
  const second = files.run();
  assert.equal(second.status, 0, second.stderr);
  assert.equal(
    fs.readFileSync(files.gradleFile, "utf8"),
    input.replaceAll("proguard-android.txt", "proguard-android-optimize.txt")
  );
});

test("conserva el parche source de VLC y admite comillas dobles en Gradle", (t) => {
  const files = fixture(
    t,
    legacyGradle.replaceAll("'", '"'),
    "const source = resolveAssetSource(this.props.source) || {};\n    source.initOptions = source.initOptions || [];\n\n"
  );
  const result = files.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(files.gradleFile, "utf8"), optimizedGradle.replaceAll("'", '"'));
  const player = fs.readFileSync(files.playerFile, "utf8");
  assert.match(player, /const resolvedSource = resolveAssetSource/);
  assert.match(player, /\[\.\.\.resolvedSource\.initOptions\]/);
  assert.doesNotMatch(player, /source\.initOptions = source\.initOptions/);
});

test("no modifica un Gradle que ya usa el archivo optimizado", (t) => {
  const files = fixture(t, optimizedGradle);
  const result = files.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(files.gradleFile, "utf8"), optimizedGradle);
});

test("falla explicitamente sin sobrescribir un Gradle desconocido", (t) => {
  const files = fixture(t, "unknown");
  const result = files.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No se encontr.*getDefaultProguardFile/);
  assert.equal(fs.readFileSync(files.gradleFile, "utf8"), "unknown");
});

test("falla explicitamente si falta el Gradle de la dependencia", (t) => {
  const files = fixture(t, null);
  const result = files.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /build\.gradle/);
});
