const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const routerContext = require.resolve("expo-router/_ctx");
const routerContexts = new Set([
  routerContext,
  path.join(path.dirname(routerContext), "_ctx.web.js"),
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
