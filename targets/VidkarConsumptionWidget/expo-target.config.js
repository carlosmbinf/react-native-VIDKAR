/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "VidkarConsumptionWidget",
  displayName: "Consumo VIDKAR",
  bundleIdentifier: ".consumption-widget",
  deploymentTarget: "15.1",
  colors: {
    $accent: "#38BDF8",
    $widgetBackground: "#08111F",
  },
  entitlements: {
    "com.apple.security.application-groups": [
      `group.${config.ios.bundleIdentifier}.shared`,
    ],
  },
});
