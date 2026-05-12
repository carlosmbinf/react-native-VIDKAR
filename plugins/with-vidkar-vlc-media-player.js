const { withAppBuildGradle, withInfoPlist } = require("@expo/config-plugins");
const generateCode = require("@expo/config-plugins/build/utils/generateCode");

const GRADLE_TAG = "withVidkarVlcMediaPlayer";

const VLC_ANDROID_TASKS = `tasks.whenTaskAdded((tas -> {
    if (tas.name.contains("merge") && tas.name.contains("NativeLibs")) {
        tasks.named(tas.name) { it
            doFirst {
                def reactAndroidDir = it.externalLibNativeLibs
                        .getFiles()
                        .stream()
                        .filter(file -> file.toString().contains("jetified-react-android"))
                        .findAny()
                        .orElse(null)
                if (reactAndroidDir != null) {
                    java.nio.file.Files.walk(reactAndroidDir.toPath()).forEach(file -> {
                        if (file.toString().contains("libc++_shared.so")) {
                            java.nio.file.Files.deleteIfExists(file)
                        }
                    })
                }
            }
        }
    }
}))`;

const withVlcAndroidGradle = (config) =>
  withAppBuildGradle(config, (config) => {
    const merged = generateCode.mergeContents({
      tag: GRADLE_TAG,
      src: config.modResults.contents,
      newSrc: VLC_ANDROID_TASKS,
      anchor: /autolinkLibrariesWithApp\(\)/i,
      offset: 2,
      comment: "//",
    });

    config.modResults.contents = merged.contents;
    return config;
  });

const withVlcInfoPlist = (config) =>
  withInfoPlist(config, (config) => {
    config.modResults.NSLocalNetworkUsageDescription =
      config.modResults.NSLocalNetworkUsageDescription ||
      "VIDKAR necesita acceso a la red local para reproducir contenido multimedia y subtítulos desde servidores compatibles con VLC.";
    return config;
  });

module.exports = function withVidkarVlcMediaPlayer(config) {
  config = withVlcAndroidGradle(config);
  config = withVlcInfoPlist(config);
  return config;
};
