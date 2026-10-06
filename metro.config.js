const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const routerContexts = new Set([
  require.resolve("expo-router/_ctx.js"),
  require.resolve("expo-router/_ctx.web.js"),
]);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolved = context.resolveRequest(context, moduleName, platform);
  if (platform === "web" && resolved.type === "sourceFile" && routerContexts.has(resolved.filePath)) {
    return {
      type: "sourceFile",
      filePath: path.join(__dirname, "services/navigation/routerContext.web.js"),
    };
  }
  return resolved;
};

module.exports = config;
