const fs = require("fs");
const path = require("path");

const { withDangerousMod } = require("@expo/config-plugins");

const TARGET_NAME = "NotificationServiceExtension";
const PRODUCT_NAME = "NotificationServiceExtension";
const PRODUCT_FILE_NAME = "NotificationServiceExtension.appex";
const GROUP_PATH = "NotificationServiceExtension";

const IDS = {
  buildFileSource: "A1B2C3010F0F0F0F0F0F0001",
  buildFileEmbed: "A1B2C3010F0F0F0F0F0F0002",
  targetProxy: "A1B2C3010F0F0F0F0F0F0003",
  copyFilesPhase: "A1B2C3010F0F0F0F0F0F0004",
  productFile: "A1B2C3010F0F0F0F0F0F0005",
  swiftFile: "A1B2C3010F0F0F0F0F0F0006",
  plistFile: "A1B2C3010F0F0F0F0F0F0007",
  frameworksPhase: "A1B2C3010F0F0F0F0F0F0008",
  group: "A1B2C3010F0F0F0F0F0F0009",
  target: "A1B2C3010F0F0F0F0F0F000A",
  resourcesPhase: "A1B2C3010F0F0F0F0F0F000B",
  sourcesPhase: "A1B2C3010F0F0F0F0F0F000C",
  targetDependency: "A1B2C3010F0F0F0F0F0F000D",
  buildConfigDebug: "A1B2C3010F0F0F0F0F0F000E",
  buildConfigRelease: "A1B2C3010F0F0F0F0F0F000F",
  configList: "A1B2C3010F0F0F0F0F0F0010",
};

const INFO_PLIST_CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>Notification Service</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>$(MARKETING_VERSION)</string>
    <key>CFBundleVersion</key>
    <string>$(CURRENT_PROJECT_VERSION)</string>
    <key>NSExtension</key>
    <dict>
      <key>NSExtensionPointIdentifier</key>
      <string>com.apple.usernotifications.service</string>
      <key>NSExtensionPrincipalClass</key>
      <string>$(PRODUCT_MODULE_NAME).NotificationService</string>
    </dict>
  </dict>
</plist>
`;

const SWIFT_CONTENT = `import Foundation
import UniformTypeIdentifiers
import UserNotifications

final class NotificationService: UNNotificationServiceExtension {
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var bestAttemptContent: UNMutableNotificationContent?
  private var downloadTask: URLSessionDownloadTask?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

    guard let bestAttemptContent else {
      contentHandler(request.content)
      return
    }

    guard let imageURL = Self.extractImageURL(from: bestAttemptContent.userInfo) else {
      contentHandler(bestAttemptContent)
      return
    }

    attachImage(from: imageURL, to: bestAttemptContent) {
      contentHandler(bestAttemptContent)
    }
  }

  override func serviceExtensionTimeWillExpire() {
    downloadTask?.cancel()

    if let contentHandler, let bestAttemptContent {
      contentHandler(bestAttemptContent)
    }
  }

  private func attachImage(
    from remoteURL: URL,
    to content: UNMutableNotificationContent,
    completion: @escaping () -> Void
  ) {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.timeoutIntervalForRequest = 20
    configuration.timeoutIntervalForResource = 20

    downloadTask = URLSession(configuration: configuration).downloadTask(with: remoteURL) {
      [weak self] temporaryURL, response, _ in
      defer {
        self?.downloadTask = nil
      }

      guard
        let temporaryURL,
        let localAttachmentURL = Self.persistAttachment(
          from: temporaryURL,
          sourceURL: remoteURL,
          mimeType: response?.mimeType
        )
      else {
        completion()
        return
      }

      do {
        let attachment = try UNNotificationAttachment(
          identifier: "image",
          url: localAttachmentURL,
          options: nil
        )
        content.attachments = [attachment]
      } catch {
      }

      completion()
    }

    downloadTask?.resume()
  }

  private static func persistAttachment(
    from temporaryURL: URL,
    sourceURL: URL,
    mimeType: String?
  ) -> URL? {
    let fileManager = FileManager.default
    let fileExtension = preferredFileExtension(for: sourceURL, mimeType: mimeType)
    let targetURL = fileManager.temporaryDirectory
      .appendingPathComponent(UUID().uuidString)
      .appendingPathExtension(fileExtension)

    do {
      if fileManager.fileExists(atPath: targetURL.path) {
        try fileManager.removeItem(at: targetURL)
      }

      try fileManager.moveItem(at: temporaryURL, to: targetURL)
      return targetURL
    } catch {
      return nil
    }
  }

  private static func preferredFileExtension(for sourceURL: URL, mimeType: String?) -> String {
    let pathExtension = sourceURL.pathExtension.trimmingCharacters(in: .whitespacesAndNewlines)
    if !pathExtension.isEmpty {
      return pathExtension
    }

    if let mimeType,
       let type = UTType(mimeType: mimeType),
       let preferredExtension = type.preferredFilenameExtension,
       !preferredExtension.isEmpty {
      return preferredExtension
    }

    return "jpg"
  }

  private static func extractImageURL(from userInfo: [AnyHashable: Any]) -> URL? {
    if let directURL = findImageURL(in: userInfo) {
      return directURL
    }

    if let richContent = userInfo["richContent"] as? [AnyHashable: Any],
       let richURL = findImageURL(in: richContent) {
      return richURL
    }

    if let data = userInfo["data"] as? [AnyHashable: Any],
       let dataURL = findImageURL(in: data) {
      return dataURL
    }

    if let dataString = userInfo["data"] as? String,
       let jsonData = dataString.data(using: .utf8),
       let object = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
       let parsedURL = findImageURL(in: object) {
      return parsedURL
    }

    return nil
  }

  private static func findImageURL(in dictionary: [AnyHashable: Any]) -> URL? {
    let keys = [
      "imageUrl",
      "image",
      "image_url",
      "notificationImageUrl",
      "attachmentUrl",
      "attachment",
      "attachment_url",
      "mediaUrl",
      "media",
      "media_url",
      "photo",
      "picture",
      "thumbnail"
    ]

    for key in keys {
      if let value = dictionary[key] as? String,
         let url = normalizedURL(from: value) {
        return url
      }
    }

    if let nestedImage = dictionary["notificationImage"] as? [AnyHashable: Any],
       let value = nestedImage["url"] as? String,
       let url = normalizedURL(from: value) {
      return url
    }

    return nil
  }

  private static func normalizedURL(from value: String) -> URL? {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty,
          let url = URL(string: trimmed),
          let scheme = url.scheme?.lowercased(),
          scheme == "https" || scheme == "http" else {
      return nil
    }

    return url
  }
}
`;

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFileIfChanged(filePath, content) {
  if (fs.existsSync(filePath)) {
    const current = fs.readFileSync(filePath, "utf8");
    if (current === content) {
      return;
    }
  }

  fs.writeFileSync(filePath, content);
}

function insertBefore(source, marker, block) {
  if (source.includes(block.trim())) {
    return source;
  }

  const index = source.indexOf(marker);
  if (index === -1) {
    throw new Error(`No se encontro el marcador requerido en project.pbxproj: ${marker}`);
  }

  return `${source.slice(0, index)}${block}${source.slice(index)}`;
}

function insertAfter(source, marker, block) {
  if (source.includes(block.trim())) {
    return source;
  }

  const index = source.indexOf(marker);
  if (index === -1) {
    throw new Error(`No se encontro el marcador requerido en project.pbxproj: ${marker}`);
  }

  const insertIndex = index + marker.length;
  return `${source.slice(0, insertIndex)}${block}${source.slice(insertIndex)}`;
}

function extractDevelopmentTeam(projectText) {
  const match = projectText.match(/DEVELOPMENT_TEAM = ([A-Z0-9]+);/);
  return match ? match[1] : "";
}

function extractDeploymentTarget(projectText) {
  const match = projectText.match(/IPHONEOS_DEPLOYMENT_TARGET = ([0-9.]+);/);
  return match ? match[1] : "15.1";
}

function addExtensionTargetToProject(projectText, { bundleIdentifier, developmentTeam, deploymentTarget }) {
  if (projectText.includes(`/* ${TARGET_NAME} */ = {`)) {
    return projectText;
  }

  const buildFileBlock = `\t\t${IDS.buildFileSource} /* NotificationService.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${IDS.swiftFile} /* NotificationService.swift */; };\n\t\t${IDS.buildFileEmbed} /* NotificationServiceExtension.appex in Embed App Extensions */ = {isa = PBXBuildFile; fileRef = ${IDS.productFile} /* NotificationServiceExtension.appex */; settings = {ATTRIBUTES = (CodeSignOnCopy, RemoveHeadersOnCopy, ); }; };\n`;
  projectText = insertBefore(projectText, "/* End PBXBuildFile section */", buildFileBlock);

  const containerProxyBlock = `\n/* Begin PBXContainerItemProxy section */\n\t\t${IDS.targetProxy} /* PBXContainerItemProxy */ = {\n\t\t\tisa = PBXContainerItemProxy;\n\t\t\tcontainerPortal = 83CBB9F71A601CBA00E9B192 /* Project object */;\n\t\t\tproxyType = 1;\n\t\t\tremoteGlobalIDString = ${IDS.target};\n\t\t\tremoteInfo = ${TARGET_NAME};\n\t\t};\n/* End PBXContainerItemProxy section */\n`;
  projectText = insertBefore(projectText, "/* Begin PBXFileReference section */", containerProxyBlock);

  const copyFilesBlock = `\n/* Begin PBXCopyFilesBuildPhase section */\n\t\t${IDS.copyFilesPhase} /* Embed App Extensions */ = {\n\t\t\tisa = PBXCopyFilesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tdstPath = \"\";\n\t\t\tdstSubfolderSpec = 13;\n\t\t\tfiles = (\n\t\t\t\t${IDS.buildFileEmbed} /* NotificationServiceExtension.appex in Embed App Extensions */,\n\t\t\t);\n\t\t\tname = \"Embed App Extensions\";\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t};\n/* End PBXCopyFilesBuildPhase section */\n`;
  projectText = insertBefore(projectText, "/* Begin PBXFileReference section */", copyFilesBlock);

  const fileRefBlock = `\t\t${IDS.productFile} /* NotificationServiceExtension.appex */ = {isa = PBXFileReference; explicitFileType = \"wrapper.app-extension\"; includeInIndex = 0; path = ${PRODUCT_FILE_NAME}; sourceTree = BUILT_PRODUCTS_DIR; };\n\t\t${IDS.swiftFile} /* NotificationService.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = NotificationService.swift; sourceTree = \"<group>\"; };\n\t\t${IDS.plistFile} /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = \"<group>\"; };\n`;
  projectText = insertBefore(projectText, "/* End PBXFileReference section */", fileRefBlock);

  const frameworksPhaseBlock = `\t\t${IDS.frameworksPhase} /* Frameworks */ = {\n\t\t\tisa = PBXFrameworksBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t};\n`;
  projectText = insertBefore(projectText, "/* End PBXFrameworksBuildPhase section */", frameworksPhaseBlock);

  const groupBlock = `\t\t${IDS.group} /* ${TARGET_NAME} */ = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n\t\t\t\t${IDS.swiftFile} /* NotificationService.swift */,\n\t\t\t\t${IDS.plistFile} /* Info.plist */,\n\t\t\t);\n\t\t\tpath = ${GROUP_PATH};\n\t\t\tsourceTree = \"<group>\";\n\t\t};\n`;
  projectText = insertBefore(projectText, "\t\t14820194822F2DB305D94DDD /* Vidkar */ = {", groupBlock);

  projectText = insertAfter(projectText, "\t\t\t\t13B07FAE1A68108700A75B9A /* Vidkar */,\n", `\t\t\t\t${IDS.group} /* ${TARGET_NAME} */,\n`);
  projectText = insertAfter(projectText, "\t\t\t\t13B07F961A680F5B00A75B9A /* Vidkar.app */,\n", `\t\t\t\t${IDS.productFile} /* NotificationServiceExtension.appex */,\n`);

  const nativeTargetBlock = `\t\t${IDS.target} /* ${TARGET_NAME} */ = {\n\t\t\tisa = PBXNativeTarget;\n\t\t\tbuildConfigurationList = ${IDS.configList} /* Build configuration list for PBXNativeTarget \"${TARGET_NAME}\" */;\n\t\t\tbuildPhases = (\n\t\t\t\t${IDS.sourcesPhase} /* Sources */,\n\t\t\t\t${IDS.frameworksPhase} /* Frameworks */,\n\t\t\t\t${IDS.resourcesPhase} /* Resources */,\n\t\t\t);\n\t\t\tbuildRules = (\n\t\t\t);\n\t\t\tdependencies = (\n\t\t\t);\n\t\t\tname = ${TARGET_NAME};\n\t\t\tproductName = ${PRODUCT_NAME};\n\t\t\tproductReference = ${IDS.productFile} /* NotificationServiceExtension.appex */;\n\t\t\tproductType = \"com.apple.product-type.app-extension\";\n\t\t};\n`;
  projectText = insertBefore(projectText, "/* End PBXNativeTarget section */", nativeTargetBlock);

  projectText = insertAfter(projectText, "\t\t\ttargets = (\n\t\t\t\t13B07F861A680F5B00A75B9A /* Vidkar */,\n", `\t\t\t\t${IDS.target} /* ${TARGET_NAME} */,\n`);

  const resourcesPhaseBlock = `\t\t${IDS.resourcesPhase} /* Resources */ = {\n\t\t\tisa = PBXResourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t};\n`;
  projectText = insertBefore(projectText, "/* End PBXResourcesBuildPhase section */", resourcesPhaseBlock);

  const sourcesPhaseBlock = `\t\t${IDS.sourcesPhase} /* Sources */ = {\n\t\t\tisa = PBXSourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n\t\t\t\t${IDS.buildFileSource} /* NotificationService.swift in Sources */,\n\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t};\n`;
  projectText = insertBefore(projectText, "/* End PBXSourcesBuildPhase section */", sourcesPhaseBlock);

  const targetDependencyBlock = `\n/* Begin PBXTargetDependency section */\n\t\t${IDS.targetDependency} /* PBXTargetDependency */ = {\n\t\t\tisa = PBXTargetDependency;\n\t\t\tname = ${TARGET_NAME};\n\t\t\ttarget = ${IDS.target} /* ${TARGET_NAME} */;\n\t\t\ttargetProxy = ${IDS.targetProxy} /* PBXContainerItemProxy */;\n\t\t};\n/* End PBXTargetDependency section */\n`;
  projectText = insertBefore(projectText, "/* Begin XCBuildConfiguration section */", targetDependencyBlock);

  const buildConfigBlock = `\t\t${IDS.buildConfigDebug} /* Debug */ = {\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = {\n\t\t\t\tAPPLICATION_EXTENSION_API_ONLY = YES;\n\t\t\t\tCLANG_ENABLE_MODULES = YES;\n\t\t\t\tCODE_SIGN_STYLE = Automatic;\n\t\t\t\tCURRENT_PROJECT_VERSION = 1;\n\t\t\t\t${developmentTeam ? `DEVELOPMENT_TEAM = ${developmentTeam};\n\t\t\t\t` : ""}INFOPLIST_FILE = ${GROUP_PATH}/Info.plist;\n\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = ${deploymentTarget};\n\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (\n\t\t\t\t\t\"$(inherited)\",\n\t\t\t\t\t\"@executable_path/Frameworks\",\n\t\t\t\t\t\"@executable_path/../../Frameworks\",\n\t\t\t\t);\n\t\t\t\tMARKETING_VERSION = 1.0;\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = ${bundleIdentifier};\n\t\t\t\tPRODUCT_NAME = ${PRODUCT_NAME};\n\t\t\t\tSKIP_INSTALL = YES;\n\t\t\t\tSWIFT_VERSION = 5.0;\n\t\t\t\tTARGETED_DEVICE_FAMILY = \"1,2\";\n\t\t\t};\n\t\t\tname = Debug;\n\t\t};\n\t\t${IDS.buildConfigRelease} /* Release */ = {\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = {\n\t\t\t\tAPPLICATION_EXTENSION_API_ONLY = YES;\n\t\t\t\tCLANG_ENABLE_MODULES = YES;\n\t\t\t\tCODE_SIGN_STYLE = Automatic;\n\t\t\t\tCURRENT_PROJECT_VERSION = 1;\n\t\t\t\t${developmentTeam ? `DEVELOPMENT_TEAM = ${developmentTeam};\n\t\t\t\t` : ""}INFOPLIST_FILE = ${GROUP_PATH}/Info.plist;\n\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = ${deploymentTarget};\n\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (\n\t\t\t\t\t\"$(inherited)\",\n\t\t\t\t\t\"@executable_path/Frameworks\",\n\t\t\t\t\t\"@executable_path/../../Frameworks\",\n\t\t\t\t);\n\t\t\t\tMARKETING_VERSION = 1.0;\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = ${bundleIdentifier};\n\t\t\t\tPRODUCT_NAME = ${PRODUCT_NAME};\n\t\t\t\tSKIP_INSTALL = YES;\n\t\t\t\tSWIFT_VERSION = 5.0;\n\t\t\t\tTARGETED_DEVICE_FAMILY = \"1,2\";\n\t\t\t};\n\t\t\tname = Release;\n\t\t};\n`;
  projectText = insertBefore(projectText, "\t\t83CBBA201A601CBA00E9B192 /* Debug */ = {", buildConfigBlock);

  const configListBlock = `\t\t${IDS.configList} /* Build configuration list for PBXNativeTarget \"${TARGET_NAME}\" */ = {\n\t\t\tisa = XCConfigurationList;\n\t\t\tbuildConfigurations = (\n\t\t\t\t${IDS.buildConfigDebug} /* Debug */,\n\t\t\t\t${IDS.buildConfigRelease} /* Release */,\n\t\t\t);\n\t\t\tdefaultConfigurationIsVisible = 0;\n\t\t\tdefaultConfigurationName = Release;\n\t\t};\n`;
  projectText = insertBefore(projectText, "\t\t83CBB9FA1A601CBA00E9B192 /* Build configuration list for PBXProject \"Vidkar\" */ = {", configListBlock);

  projectText = projectText.replace(
    /(\t\t\t\t13B07F8E1A680F5B00A75B9A \/\* Resources \*\/,[\s\S]*?)(\t\t\t\t00DD1BFF1BD5951E006B06BC \/\* Bundle React Native code and images \*\/)/,
    (_, first, second) => {
      if (first.includes(`${IDS.copyFilesPhase} /* Embed App Extensions */`)) {
        return `${first}${second}`;
      }

      return `${first}\t\t\t\t${IDS.copyFilesPhase} /* Embed App Extensions */,\n${second}`;
    }
  );

  projectText = projectText.replace(
    /(\t\t\tdependencies = \(\n)([\s\S]*?)(\t\t\t\);\n\t\t\tname = Vidkar;)/,
    (_, start, middle, end) => {
      if (middle.includes(`${IDS.targetDependency} /* PBXTargetDependency */`)) {
        return `${start}${middle}${end}`;
      }

      return `${start}${middle}\t\t\t\t${IDS.targetDependency} /* PBXTargetDependency */,\n${end}`;
    }
  );

  return projectText;
}

const withNotificationServiceExtension = (config) => {
  return withDangerousMod(config, ["ios", async (currentConfig) => {
    const platformRoot = currentConfig.modRequest.platformProjectRoot;
    const projectName = currentConfig.modRequest.projectName;
    const extensionDir = path.join(platformRoot, GROUP_PATH);
    const infoPlistPath = path.join(extensionDir, "Info.plist");
    const swiftPath = path.join(extensionDir, "NotificationService.swift");
    const pbxprojPath = path.join(platformRoot, `${projectName}.xcodeproj`, "project.pbxproj");

    ensureDirectory(extensionDir);
    writeFileIfChanged(infoPlistPath, INFO_PLIST_CONTENT);
    writeFileIfChanged(swiftPath, SWIFT_CONTENT);

    if (!fs.existsSync(pbxprojPath)) {
      throw new Error(`No se encontro el proyecto Xcode en ${pbxprojPath}`);
    }

    const currentProject = fs.readFileSync(pbxprojPath, "utf8");
    const baseBundleId = currentConfig.ios?.bundleIdentifier || "com.vidkar";
    const bundleIdentifier = `${baseBundleId}.${PRODUCT_NAME}`;
    const developmentTeam = extractDevelopmentTeam(currentProject);
    const deploymentTarget = extractDeploymentTarget(currentProject);
    const nextProject = addExtensionTargetToProject(currentProject, {
      bundleIdentifier,
      developmentTeam,
      deploymentTarget,
    });

    if (nextProject !== currentProject) {
      fs.writeFileSync(pbxprojPath, nextProject);
    }

    return currentConfig;
  }]);
};

module.exports = withNotificationServiceExtension;