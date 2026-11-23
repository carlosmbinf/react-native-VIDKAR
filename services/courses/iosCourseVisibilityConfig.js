export const IOS_COURSES_VISIBILITY_CONFIG_ID = "VIDKAR_IOS_COURSES_VISIBILITY";

export const isIosCoursesVisibilityEnabled = (config) =>
  config?.type === "APP_FEATURE" &&
  config?.clave === "IOS_COURSES_VISIBILITY" &&
  config?.active === true &&
  config?.valor === "true";

export const shouldShowCoursesOnPlatform = (platform, enabled) =>
  platform !== "ios" || enabled === true;
