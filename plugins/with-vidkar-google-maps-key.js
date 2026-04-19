const { AndroidConfig, createRunOncePlugin } = require("@expo/config-plugins");

const pkg = {
  name: "with-vidkar-google-maps-key",
  version: "1.0.0",
};

const withVidkarGoogleMapsKey = (config) => {
  return AndroidConfig.GoogleMapsApiKey.withGoogleMapsApiKey(config);
};

module.exports = createRunOncePlugin(
  withVidkarGoogleMapsKey,
  pkg.name,
  pkg.version,
);