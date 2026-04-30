const fs = require("fs");
const path = require("path");
const plist = require("@expo/plist").default;
const pbxFile = require("xcode/lib/pbxFile");
const {
  IOSConfig,
  createRunOncePlugin,
  withDangerousMod,
  withXcodeProject,
} = require("expo/config-plugins");

const pkg = {
  name: "with-vidkar-watch-app",
  version: "1.0.0",
};

const DEFAULT_TARGET_NAME = "VidkarWatch";
const DEFAULT_DISPLAY_NAME = "Vidkar";
const DEFAULT_DEPLOYMENT_TARGET = "8.0";
const WATCH_APP_PRODUCT_TYPE = '"com.apple.product-type.application.watchapp2"';

const WATCH_ICON_SPECS = [
  { size: 24, scale: 2, role: "notificationCenter", subtype: "38mm" },
  { size: 27.5, scale: 2, role: "notificationCenter", subtype: "42mm" },
  { size: 29, scale: 2, role: "companionSettings" },
  { size: 29, scale: 3, role: "companionSettings" },
  { size: 40, scale: 2, role: "appLauncher", subtype: "38mm" },
  { size: 44, scale: 2, role: "appLauncher", subtype: "40mm" },
  { size: 86, scale: 2, role: "quickLook", subtype: "38mm" },
  { size: 98, scale: 2, role: "quickLook", subtype: "42mm" },
  { size: 108, scale: 2, role: "quickLook", subtype: "44mm" },
  { size: 1024, scale: 1, idiom: "watch-marketing" },
];

function stripQuotes(value) {
  return String(value || "").replace(/^"|"$/g, "");
}

function resolveOptions(config, options = {}) {
  const targetName = options.targetName || DEFAULT_TARGET_NAME;
  const displayName = options.displayName || config.name || DEFAULT_DISPLAY_NAME;
  const iosBundleIdentifier = config.ios?.bundleIdentifier;
  const developmentTeam =
    options.developmentTeam || IOSConfig.DevelopmentTeam.getDevelopmentTeam(config);

  if (!iosBundleIdentifier) {
    throw new Error("with-vidkar-watch-app requiere expo.ios.bundleIdentifier.");
  }

  return {
    targetName,
    displayName,
    sourceDir: options.sourceDir || path.join("watchos", targetName),
    bundleIdentifier:
      options.bundleIdentifier || `${iosBundleIdentifier}.watchkitapp`,
    companionBundleIdentifier: iosBundleIdentifier,
    deploymentTarget: options.deploymentTarget || DEFAULT_DEPLOYMENT_TARGET,
    developmentTeam,
    icon: options.icon || config.ios?.icon || config.icon,
  };
}

function ensureEasAppExtensionConfig(config, options) {
  config.extra = config.extra || {};
  config.extra.eas = config.extra.eas || {};
  config.extra.eas.build = config.extra.eas.build || {};
  config.extra.eas.build.experimental =
    config.extra.eas.build.experimental || {};
  config.extra.eas.build.experimental.ios =
    config.extra.eas.build.experimental.ios || {};

  const iosExperimental = config.extra.eas.build.experimental.ios;
  iosExperimental.appExtensions = iosExperimental.appExtensions || [];

  const existingExtension = iosExperimental.appExtensions.find(
    (extension) => extension.targetName === options.targetName,
  );

  if (existingExtension) {
    existingExtension.bundleIdentifier = options.bundleIdentifier;
    return;
  }

  iosExperimental.appExtensions.push({
    targetName: options.targetName,
    bundleIdentifier: options.bundleIdentifier,
  });
}

function buildWatchInfoPlist(config, options) {
  return {
    CFBundleDevelopmentRegion: "$(DEVELOPMENT_LANGUAGE)",
    CFBundleDisplayName: options.displayName,
    CFBundleExecutable: "$(EXECUTABLE_NAME)",
    CFBundleIdentifier: "$(PRODUCT_BUNDLE_IDENTIFIER)",
    CFBundleInfoDictionaryVersion: "6.0",
    CFBundleName: "$(PRODUCT_NAME)",
    CFBundlePackageType: "$(PRODUCT_BUNDLE_PACKAGE_TYPE)",
    CFBundleShortVersionString: IOSConfig.Version.getVersion(config),
    CFBundleVersion: IOSConfig.Version.getBuildNumber(config),
    WKApplication: true,
    WKCompanionAppBundleIdentifier: options.companionBundleIdentifier,
  };
}

async function generateWatchIconAsync(projectRoot, iconPath, appIconSetPath) {
  if (!iconPath) {
    return;
  }

  const resolvedIconPath = path.resolve(projectRoot, iconPath);
  if (!fs.existsSync(resolvedIconPath)) {
    return;
  }

  const { generateImageAsync } = require("@expo/image-utils");
  const images = [];

  await fs.promises.mkdir(appIconSetPath, { recursive: true });

  for (const spec of WATCH_ICON_SPECS) {
    const pixels = Math.round(spec.size * spec.scale);
    const filename = spec.idiom
      ? `watch-marketing-${pixels}.png`
      : `watch-${spec.role}-${spec.subtype || "all"}-${pixels}.png`;
    const { source } = await generateImageAsync(
      { projectRoot, cacheType: "vidkar-watch-icon" },
      {
        src: resolvedIconPath,
        width: pixels,
        height: pixels,
        resizeMode: "cover",
        backgroundColor: "#09111f",
        removeTransparency: true,
      },
    );

    await fs.promises.writeFile(path.join(appIconSetPath, filename), source);

    if (spec.idiom) {
      images.push({
        filename,
        idiom: spec.idiom,
        scale: `${spec.scale}x`,
        size: `${spec.size}x${spec.size}`,
      });
    } else {
      images.push({
        filename,
        idiom: "watch",
        role: spec.role,
        scale: `${spec.scale}x`,
        size: `${spec.size}x${spec.size}`,
        ...(spec.subtype ? { subtype: spec.subtype } : {}),
      });
    }
  }

  await fs.promises.writeFile(
    path.join(appIconSetPath, "Contents.json"),
    JSON.stringify({ images, info: { author: "xcode", version: 1 } }, null, 2),
  );
}

function getMainGroupId(project) {
  return project.getFirstProject().firstProject.mainGroup;
}

function ensureTopLevelGroup(project, name) {
  const mainGroup = project.getPBXGroupByKey(getMainGroupId(project));
  const existing = mainGroup.children.find(
    (child) => stripQuotes(child.comment) === name,
  );

  if (existing) {
    return existing.value;
  }

  const groupId = project.pbxCreateGroup(name, '""');
  mainGroup.children.push({ value: groupId, comment: name });
  return groupId;
}

function getNativeTargetByName(project, targetName) {
  const targets = project.pbxNativeTargetSection();

  return Object.entries(targets).find(([, target]) => {
    return (
      target &&
      typeof target === "object" &&
      stripQuotes(target.name) === targetName
    );
  });
}

function ensureBuildPhase(project, targetUuid, isa, name) {
  const target = project.pbxNativeTargetSection()[targetUuid];
  const phaseSection = project.hash.project.objects[isa] || {};
  const existing = target.buildPhases.find((phase) => {
    const phaseObject = phaseSection[phase.value];
    return (
      phaseObject &&
      (stripQuotes(phaseObject.name) === name || stripQuotes(phase.comment) === name)
    );
  });

  if (existing) {
    return existing.value;
  }

  const { uuid } = project.addBuildPhase([], isa, name, targetUuid);
  return uuid;
}

function getBuildPhaseObject(project, phase) {
  const buildPhaseTypes = [
    "PBXSourcesBuildPhase",
    "PBXResourcesBuildPhase",
    "PBXFrameworksBuildPhase",
    "PBXCopyFilesBuildPhase",
  ];

  for (const isa of buildPhaseTypes) {
    const section = project.hash.project.objects[isa] || {};
    const phaseObject = section[phase.value];

    if (phaseObject) {
      return { isa, section, phaseObject };
    }
  }

  return null;
}

function getBuildPhaseName(phase, phaseObject) {
  return stripQuotes(phaseObject.name) || stripQuotes(phase.comment);
}

function pruneDuplicateWatchBuildPhases(project, targetUuid) {
  const target = project.pbxNativeTargetSection()[targetUuid];
  const phaseKeys = new Map();
  const removedPhaseIds = new Set();

  for (const phase of target.buildPhases || []) {
    const resolvedPhase = getBuildPhaseObject(project, phase);

    if (!resolvedPhase) {
      continue;
    }

    const phaseName = getBuildPhaseName(phase, resolvedPhase.phaseObject);
    const shouldDedupe = ["Sources", "Resources", "Frameworks"].includes(phaseName);

    if (!shouldDedupe) {
      continue;
    }

    const key = `${resolvedPhase.isa}:${phaseName}`;
    const current = phaseKeys.get(key);
    const currentFileCount = current?.phaseObject.files?.length || 0;
    const nextFileCount = resolvedPhase.phaseObject.files?.length || 0;

    if (!current) {
      phaseKeys.set(key, { phase, ...resolvedPhase });
      continue;
    }

    if (currentFileCount === 0 && nextFileCount > 0) {
      removedPhaseIds.add(current.phase.value);
      phaseKeys.set(key, { phase, ...resolvedPhase });
    } else {
      removedPhaseIds.add(phase.value);
    }
  }

  if (removedPhaseIds.size === 0) {
    return;
  }

  target.buildPhases = target.buildPhases.filter(
    (phase) => !removedPhaseIds.has(phase.value),
  );

  for (const removedPhaseId of removedPhaseIds) {
    const resolvedPhase = getBuildPhaseObject(project, { value: removedPhaseId });

    if (resolvedPhase) {
      delete resolvedPhase.section[removedPhaseId];
      delete resolvedPhase.section[`${removedPhaseId}_comment`];
    }
  }
}

function ensureDependencySections(project) {
  project.hash.project.objects.PBXTargetDependency =
    project.hash.project.objects.PBXTargetDependency || {};
  project.hash.project.objects.PBXContainerItemProxy =
    project.hash.project.objects.PBXContainerItemProxy || {};
}

function hasTargetDependency(project, targetUuid, dependencyTargetUuid) {
  const target = project.pbxNativeTargetSection()[targetUuid];
  const dependencies = target?.dependencies || [];
  const dependencySection = project.hash.project.objects.PBXTargetDependency || {};

  return dependencies.some((dependency) => {
    const dependencyObject = dependencySection[dependency.value];
    return dependencyObject?.target === dependencyTargetUuid;
  });
}

function ensureTargetDependency(project, targetUuid, dependencyTargetUuid) {
  const target = project.pbxNativeTargetSection()[targetUuid];

  if (!target || hasTargetDependency(project, targetUuid, dependencyTargetUuid)) {
    return;
  }

  ensureDependencySections(project);
  project.addTargetDependency(targetUuid, [dependencyTargetUuid]);
}

function getBuildConfigurationsForTarget(project, targetUuid) {
  const target = project.pbxNativeTargetSection()[targetUuid];
  const configurationListId = target.buildConfigurationList;
  const configurationList = project.pbxXCConfigurationList()[configurationListId];
  const buildConfigurations = project.pbxXCBuildConfigurationSection();

  return configurationList.buildConfigurations
    .map((entry) => buildConfigurations[entry.value])
    .filter(Boolean);
}

function applyWatchBuildSettings(config, project, targetUuid, options) {
  const teamId = options.developmentTeam;
  const buildNumber = IOSConfig.Version.getBuildNumber(config);
  const version = IOSConfig.Version.getVersion(config);

  for (const buildConfiguration of getBuildConfigurationsForTarget(
    project,
    targetUuid,
  )) {
    buildConfiguration.buildSettings = {
      ...buildConfiguration.buildSettings,
      ASSETCATALOG_COMPILER_APPICON_NAME: "AppIcon",
      CODE_SIGN_STYLE: "Automatic",
      CURRENT_PROJECT_VERSION: `"${buildNumber}"`,
      GENERATE_INFOPLIST_FILE: "NO",
      INFOPLIST_FILE: `"${options.targetName}/Info.plist"`,
      MARKETING_VERSION: `"${version}"`,
      PRODUCT_BUNDLE_IDENTIFIER: `"${options.bundleIdentifier}"`,
      PRODUCT_NAME: '"$(TARGET_NAME)"',
      SDKROOT: "watchos",
      SKIP_INSTALL: "YES",
      SUPPORTED_PLATFORMS: '"watchos watchsimulator"',
      SWIFT_VERSION: "5.0",
      TARGETED_DEVICE_FAMILY: "4",
      WATCHOS_DEPLOYMENT_TARGET: options.deploymentTarget,
    };

    delete buildConfiguration.buildSettings.IPHONEOS_DEPLOYMENT_TARGET;
    delete buildConfiguration.buildSettings.CODE_SIGN_IDENTITY;
    delete buildConfiguration.buildSettings["CODE_SIGN_IDENTITY[sdk=watchos*]"];
    delete buildConfiguration.buildSettings.PROVISIONING_PROFILE_SPECIFIER;
    delete buildConfiguration.buildSettings["PROVISIONING_PROFILE_SPECIFIER[sdk=watchos*]"];

    if (teamId) {
      buildConfiguration.buildSettings.DEVELOPMENT_TEAM = teamId;
    }
  }
}

function ensureBuildFileAttribute(buildFile, attribute) {
  buildFile.settings = buildFile.settings || {};
  const attributes = Array.isArray(buildFile.settings.ATTRIBUTES)
    ? buildFile.settings.ATTRIBUTES
    : [];

  if (!attributes.includes(attribute)) {
    attributes.push(attribute);
  }

  buildFile.settings.ATTRIBUTES = attributes;
}

function ensureEmbeddedWatchAppCodeSignOnCopy(project, targetName) {
  const appTargetUuid = project.getFirstTarget().uuid;
  const appTarget = project.pbxNativeTargetSection()[appTargetUuid];
  const copyPhaseSection = project.hash.project.objects.PBXCopyFilesBuildPhase || {};
  const buildFileSection = project.pbxBuildFileSection();
  const embeddedProductName = `${targetName}.app`;

  for (const phase of appTarget.buildPhases || []) {
    const phaseObject = copyPhaseSection[phase.value];

    if (!phaseObject || stripQuotes(phaseObject.name) !== "Embed Watch Content") {
      continue;
    }

    for (const file of phaseObject.files || []) {
      const buildFile = buildFileSection[file.value];

      if (stripQuotes(buildFile?.fileRef_comment) === embeddedProductName) {
        ensureBuildFileAttribute(buildFile, "CodeSignOnCopy");
      }
    }
  }
}

function buildSchemeReference({ targetUuid, buildableName, blueprintName }) {
  return `            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "${targetUuid}"
               BuildableName = "${buildableName}"
               BlueprintName = "${blueprintName}"
               ReferencedContainer = "container:${blueprintName}.xcodeproj">
            </BuildableReference>`;
}

function replaceLaunchRunnableWithMainApp(schemeXml, mainTargetName, mainTargetUuid) {
  const mainReference = buildSchemeReference({
    targetUuid: mainTargetUuid,
    buildableName: `${mainTargetName}.app`,
    blueprintName: mainTargetName,
  });

  return schemeXml.replace(
    /(<LaunchAction[\s\S]*?<BuildableProductRunnable[\s\S]*?>)[\s\S]*?(\s*<\/BuildableProductRunnable>)/,
    `$1\n${mainReference}\n      $2`,
  );
}

function ensureMainSchemeLaunchesMainApp(projectRoot, mainTargetName, mainTargetUuid) {
  const schemePath = path.join(
    projectRoot,
    `${mainTargetName}.xcodeproj`,
    "xcshareddata",
    "xcschemes",
    `${mainTargetName}.xcscheme`,
  );

  if (!fs.existsSync(schemePath)) {
    return;
  }

  const schemeXml = fs.readFileSync(schemePath, "utf8");
  const nextSchemeXml = replaceLaunchRunnableWithMainApp(
    schemeXml,
    mainTargetName,
    mainTargetUuid,
  );

  if (nextSchemeXml !== schemeXml) {
    fs.writeFileSync(schemePath, nextSchemeXml);
  }
}

function ensureWatchAppEmbedded(project, targetName) {
  const appTargetUuid = project.getFirstTarget().uuid;
  const appTarget = project.pbxNativeTargetSection()[appTargetUuid];
  const copyPhaseSection = project.hash.project.objects.PBXCopyFilesBuildPhase || {};
  const buildFileSection = project.pbxBuildFileSection();
  const embeddedProductName = `${targetName}.app`;

  const hasEmbeddedWatchApp = appTarget.buildPhases.some((phase) => {
    const phaseObject = copyPhaseSection[phase.value];

    if (!phaseObject || stripQuotes(phaseObject.name) !== "Embed Watch Content") {
      return false;
    }

    return (phaseObject.files || []).some((file) => {
      const buildFile = buildFileSection[file.value];
      return stripQuotes(buildFile?.fileRef_comment) === embeddedProductName;
    });
  });

  if (hasEmbeddedWatchApp) {
    ensureEmbeddedWatchAppCodeSignOnCopy(project, targetName);
    return;
  }

  project.addBuildPhase(
    [embeddedProductName],
    "PBXCopyFilesBuildPhase",
    "Embed Watch Content",
    appTargetUuid,
    "watch2_app",
    '"$(CONTENTS_FOLDER_PATH)/Watch"',
  );

  ensureEmbeddedWatchAppCodeSignOnCopy(project, targetName);
}

function addFileToTargetOnce(project, filePath, targetUuid, groupId, kind) {
  if (project.hasFile(filePath)) {
    return;
  }

  const options = { target: targetUuid };

  if (kind === "source") {
    project.addSourceFile(filePath, options, groupId);
  } else if (kind === "resource") {
    const file = new pbxFile(filePath, options);
    file.uuid = project.generateUuid();
    file.fileRef = project.generateUuid();
    file.target = targetUuid;

    project.addToPbxBuildFileSection(file);
    project.addToPbxResourcesBuildPhase(file);
    project.addToPbxFileReferenceSection(file);
    project.addToPbxGroup(file, groupId);
  } else {
    project.addFile(filePath, groupId, options);
  }
}

function findSwiftFiles(rootDir, relativeRoot = "") {
  return fs.readdirSync(rootDir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeRoot, entry.name);
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      return findSwiftFiles(fullPath, relativePath);
    }

    return entry.name.endsWith(".swift") ? [relativePath] : [];
  });
}

const withWatchFiles = (config, options) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      if (config.modRequest.introspect) {
        return config;
      }

      const projectRoot = config.modRequest.projectRoot;
      const platformProjectRoot = config.modRequest.platformProjectRoot;
      const sourceRoot = path.resolve(projectRoot, options.sourceDir);
      const watchRoot = path.join(platformProjectRoot, options.targetName);

      await fs.promises.rm(watchRoot, { recursive: true, force: true });
      await fs.promises.mkdir(watchRoot, { recursive: true });

      if (fs.existsSync(sourceRoot)) {
        fs.cpSync(sourceRoot, watchRoot, { recursive: true });
      }

      await fs.promises.writeFile(
        path.join(watchRoot, "Info.plist"),
        plist.build(buildWatchInfoPlist(config, options)),
      );

      const assetsPath = path.join(watchRoot, "Assets.xcassets");
      const appIconSetPath = path.join(assetsPath, "AppIcon.appiconset");
      await fs.promises.mkdir(assetsPath, { recursive: true });
      await fs.promises.writeFile(
        path.join(assetsPath, "Contents.json"),
        JSON.stringify({ info: { author: "xcode", version: 1 } }, null, 2),
      );
      await generateWatchIconAsync(
        projectRoot,
        options.icon,
        appIconSetPath,
      );

      return config;
    },
  ]);
};

const withWatchXcodeTarget = (config, options) => {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    ensureDependencySections(project);

    const existingTarget = getNativeTargetByName(project, options.targetName);
    const createdTarget = existingTarget
      ? null
      : project.addTarget(
          options.targetName,
          "watch2_app",
          options.targetName,
          options.bundleIdentifier,
        );
    const targetUuid = existingTarget?.[0] || createdTarget.uuid;
    project.pbxNativeTargetSection()[targetUuid].productType =
      WATCH_APP_PRODUCT_TYPE;

    const productReferenceId =
      project.pbxNativeTargetSection()[targetUuid].productReference;
    const fileReferences = project.pbxFileReferenceSection();
    const productReference = fileReferences?.[productReferenceId];

    if (productReference) {
      productReference.explicitFileType = '"wrapper.application"';
      delete productReference.lastKnownFileType;
    }
    const groupId = ensureTopLevelGroup(project, options.targetName);

    ensureBuildPhase(project, targetUuid, "PBXSourcesBuildPhase", "Sources");
    ensureBuildPhase(project, targetUuid, "PBXResourcesBuildPhase", "Resources");
    ensureBuildPhase(project, targetUuid, "PBXFrameworksBuildPhase", "Frameworks");
    ensureTargetDependency(project, project.getFirstTarget().uuid, targetUuid);
    ensureWatchAppEmbedded(project, options.targetName);
    applyWatchBuildSettings(config, project, targetUuid, options);

    const sourceRoot = path.resolve(
      config.modRequest.projectRoot,
      options.sourceDir,
    );
    if (fs.existsSync(sourceRoot)) {
      for (const swiftFile of findSwiftFiles(sourceRoot)) {
        addFileToTargetOnce(
          project,
          path.posix.join(options.targetName, swiftFile.replace(/\\/g, "/")),
          targetUuid,
          groupId,
          "source",
        );
      }
    }

    addFileToTargetOnce(
      project,
      `${options.targetName}/Assets.xcassets`,
      targetUuid,
      groupId,
      "resource",
    );
    addFileToTargetOnce(
      project,
      `${options.targetName}/Info.plist`,
      targetUuid,
      groupId,
      "file",
    );

    pruneDuplicateWatchBuildPhases(project, targetUuid);

    const projectSection =
      project.pbxProjectSection()[project.getFirstProject().uuid];
    projectSection.attributes = projectSection.attributes || {};
    projectSection.attributes.TargetAttributes =
      projectSection.attributes.TargetAttributes || {};
    projectSection.attributes.TargetAttributes[targetUuid] = {
      CreatedOnToolsVersion: "15.0",
      ProvisioningStyle: "Automatic",
      ...(options.developmentTeam
        ? {
            DevelopmentTeam: options.developmentTeam,
          }
        : {}),
    };

    return config;
  });
};

const withMainSchemeRunnable = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      if (config.modRequest.introspect) {
        return config;
      }

      const platformProjectRoot = config.modRequest.platformProjectRoot;
      const mainTargetName = config.modRequest.projectName;
      const projectPath = path.join(
        platformProjectRoot,
        `${mainTargetName}.xcodeproj`,
        "project.pbxproj",
      );

      if (!fs.existsSync(projectPath)) {
        return config;
      }

      const xcode = require("xcode");
      const project = xcode.project(projectPath);
      project.parseSync();

      const mainTargetUuid = project.getFirstTarget().uuid;
      ensureMainSchemeLaunchesMainApp(
        platformProjectRoot,
        mainTargetName,
        mainTargetUuid,
      );

      return config;
    },
  ]);
};

const withVidkarWatchApp = (config, props = {}) => {
  const options = resolveOptions(config, props);

  ensureEasAppExtensionConfig(config, options);

  config = withWatchFiles(config, options);
  config = withWatchXcodeTarget(config, options);
  config = withMainSchemeRunnable(config);

  return config;
};

module.exports = createRunOncePlugin(
  withVidkarWatchApp,
  pkg.name,
  pkg.version,
);
