/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: "watch",
  name: "VidkarWatch",
  displayName: "Vidkar",
  bundleIdentifier: ".watchkitapp",
  icon: "../../assets/images/icon.png",
  deploymentTarget: "9.4",
  colors: {
    $accent: "#2563eb",
  },
});