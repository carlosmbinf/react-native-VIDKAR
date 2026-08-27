const fs = require("fs");
const path = require("path");
const { createRunOncePlugin, withDangerousMod } = require("@expo/config-plugins");

const pkg = {
  name: "with-vidkar-ios-pod-deployment-target",
  version: "1.0.0",
};

const IOS_DEPLOYMENT_TARGET = "16.4";
const POST_INSTALL_MARKER = "[with-vidkar-ios-pod-deployment-target]";

const POD_TARGET_SETTINGS = `
    # ${POST_INSTALL_MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${IOS_DEPLOYMENT_TARGET}'
      end
    end
`;

const patchPodfile = (podfilePath) => {
  if (!fs.existsSync(podfilePath)) {
    return;
  }

  const source = fs.readFileSync(podfilePath, "utf8");
  if (source.includes(POST_INSTALL_MARKER)) {
    return;
  }

  const postInstallBlock = /(\n  post_install do \|installer\|[\s\S]*?)(\n  end)/;
  if (!postInstallBlock.test(source)) {
    throw new Error(
      "No se encontró el bloque post_install esperado en el Podfile generado.",
    );
  }

  const nextSource = source.replace(
    postInstallBlock,
    `$1${POD_TARGET_SETTINGS}$2`,
  );

  fs.writeFileSync(podfilePath, nextSource);
};

const withVidkarIosPodDeploymentTarget = (config) =>
  withDangerousMod(config, ["ios", (dangerousConfig) => {
    const podfilePath = path.join(
      dangerousConfig.modRequest.platformProjectRoot,
      "Podfile",
    );
    patchPodfile(podfilePath);
    return dangerousConfig;
  }]);

module.exports = createRunOncePlugin(
  withVidkarIosPodDeploymentTarget,
  pkg.name,
  pkg.version,
);
