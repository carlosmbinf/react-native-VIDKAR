import assert from "node:assert/strict";
import test from "node:test";

import {
  isIosCoursesVisibilityEnabled,
  shouldShowCoursesOnPlatform,
} from "../services/courses/iosCourseVisibilityConfig.js";

test("la configuración de cursos iOS solo habilita el valor explícito true", () => {
  assert.equal(isIosCoursesVisibilityEnabled(null), false);
  assert.equal(isIosCoursesVisibilityEnabled({ active: true }), false);
  assert.equal(isIosCoursesVisibilityEnabled({ active: false, valor: "true" }), false);
  assert.equal(isIosCoursesVisibilityEnabled({ type: "APP_FEATURE", clave: "IOS_COURSES_VISIBILITY", active: true, valor: true }), false);
  assert.equal(isIosCoursesVisibilityEnabled({ type: "CONFIG", clave: "IOS_COURSES_VISIBILITY", active: true, valor: "true" }), false);
  assert.equal(isIosCoursesVisibilityEnabled({ type: "APP_FEATURE", clave: "IOS_COURSES_VISIBILITY", active: true, valor: "true" }), true);
});

test("el control global oculta cursos solo en iOS", () => {
  assert.equal(shouldShowCoursesOnPlatform("ios", false), false);
  assert.equal(shouldShowCoursesOnPlatform("ios", true), true);
  assert.equal(shouldShowCoursesOnPlatform("android", false), true);
  assert.equal(shouldShowCoursesOnPlatform("web", false), true);
});
