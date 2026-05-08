const fs = require("fs");
const path = require("path");
const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const PIP_IMPORTS = `import android.app.PictureInPictureParams
import android.content.res.Configuration
import android.util.Rational
import expo.modules.vidkarpip.VidkarPipState`;

const PIP_METHODS = `  override fun onUserLeaveHint() {
    super.onUserLeaveHint()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && VidkarPipState.isPlayerActive() && !isInPictureInPictureMode) {
      val params = PictureInPictureParams.Builder()
        .setAspectRatio(Rational(16, 9))
        .build()

      enterPictureInPictureMode(params)
    }
  }

  override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
    VidkarPipState.setInPictureInPicture(isInPictureInPictureMode)
  }`;

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

    if (!contents.includes("import expo.modules.vidkarpip.VidkarPipState")) {
      contents = contents.replace(
        "import expo.modules.splashscreen.SplashScreenManager\n",
        `import expo.modules.splashscreen.SplashScreenManager\n${PIP_IMPORTS}\n`
      );
    }

    if (!contents.includes("override fun onUserLeaveHint()")) {
      contents = contents.replace(
        "\n  /**\n    * Align the back button behavior with Android S",
        `\n${PIP_METHODS}\n\n  /**\n    * Align the back button behavior with Android S`
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
