// Expo 57 incluye las rutas nativas en el contexto web antes de elegir variantes.
export const ctx = require.context(
  "../../app",
  true,
  /^(?:\.\/)(?!(?:(?:.*\+api)|(?:\+middleware)|(?:\+(html|native-intent)))\.[tj]sx?$)(?!.*\.(?:native|ios|android)\.[tj]sx?$).*\.[tj]sx?$/,
  process.env.EXPO_ROUTER_IMPORT_MODE,
);
