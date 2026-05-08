const fs = require("fs");
const path = require("path");
const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const PIP_METHODS = `  override fun onUserLeaveHint() {
    super.onUserLeaveHint()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && expo.modules.vidkarpip.VidkarPipState.isPlayerActive() && !isInPictureInPictureMode) {
      val params = android.app.PictureInPictureParams.Builder()
        .setAspectRatio(android.util.Rational(16, 9))
        .build()

      enterPictureInPictureMode(params)
    }
  }

  override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: android.content.res.Configuration) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
    expo.modules.vidkarpip.VidkarPipState.setInPictureInPicture(isInPictureInPictureMode)
  }`;

const removeStalePipImports = (contents) =>
  contents
    .replace(/\nimport android\.app\.PictureInPictureParams\n/g, "\n")
    .replace(/\nimport android\.content\.res\.Configuration\n/g, "\n")
    .replace(/\nimport android\.util\.Rational\n/g, "\n")
    .replace(/\nimport expo\.modules\.vidkarpip\.VidkarPipState\n/g, "\n");

const ensureConfigChange = (activity, value) => {
  const currentValue = activity.$["android:configChanges"] || "";
  const parts = currentValue.split("|").filter(Boolean);

  if (!parts.includes(value)) {
    parts.push(value);
  }

  activity.$["android:configChanges"] = parts.join("|");
};

const withAndroidPipManifest = (config) =>
  withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    const activities = application?.activity || [];
    const mainActivity = activities.find(
      (activity) => activity.$?.["android:name"] === ".MainActivity"
    );

    if (mainActivity?.$) {
      mainActivity.$["android:supportsPictureInPicture"] = "true";
      mainActivity.$["android:resizeableActivity"] = "true";
      ensureConfigChange(mainActivity, "smallestScreenSize");
    }

    return config;
  });

const withAndroidPipMainActivity = (config) =>
  withDangerousMod(config, ["android", async (config) => {
    const mainActivityPath = path.join(
      config.modRequest.platformProjectRoot,
      "app/src/main/java/com/vidkar/MainActivity.kt"
    );

    if (!fs.existsSync(mainActivityPath)) {
      return config;
    }

    let contents = fs.readFileSync(mainActivityPath, "utf8");

    contents = removeStalePipImports(contents);

    if (!contents.includes("override fun onUserLeaveHint()")) {
      contents = contents.replace(
        "\n  /**\n    * Align the back button behavior with Android S",
        `\n${PIP_METHODS}\n\n  /**\n    * Align the back button behavior with Android S`
      );
    } else if (!contents.includes("expo.modules.vidkarpip.VidkarPipState.isPlayerActive()")) {
      contents = contents.replace(
        /\n  override fun onUserLeaveHint\(\)[\s\S]*?\n  override fun onPictureInPictureModeChanged\([\s\S]*?\n  }\n/,
        `\n${PIP_METHODS}\n`
      );
    }

    fs.writeFileSync(mainActivityPath, contents);
    return config;
  }]);

module.exports = function withVidkarAndroidPip(config) {
  config = withAndroidPipManifest(config);
  config = withAndroidPipMainActivity(config);
  return config;
};
