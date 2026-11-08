const assert = require("node:assert/strict");
const test = require("node:test");
const { withBuildProperties } = require("expo-build-properties");
const appConfig = require("../app.json").expo;

const [, buildProperties] = appConfig.plugins.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === "expo-build-properties"
);

for (const existing of [false, true]) {
  test(`prebuild configura API 37 ${existing ? "reemplazando propiedades anteriores" : "desde cero"}`, async () => {
    const config = withBuildProperties(
      { name: "Android build test", slug: "android-build-test" },
      buildProperties
    );
    const modResults = existing
      ? [
          { type: "property", key: "android.compileSdkVersion", value: "36" },
          { type: "property", key: "android.buildToolsVersion", value: "36.0.0" },
        ]
      : [];
    const result = await config.mods.android.gradleProperties({
      ...config,
      modResults,
      modRequest: { platform: "android", modName: "gradleProperties" },
    });
    const properties = Object.fromEntries(
      result.modResults
        .filter((entry) => entry.type === "property")
        .map(({ key, value }) => [key, value])
    );
    assert.equal(properties["android.compileSdkVersion"], "37");
    assert.equal(properties["android.buildToolsVersion"], "37.0.0");
    assert.equal(properties["android.targetSdkVersion"], "36");
    assert.equal(properties["android.minSdkVersion"], "26");
    assert.equal(
      result.modResults.filter((entry) => entry.key === "android.compileSdkVersion").length,
      1
    );
  });
}
