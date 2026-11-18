import assert from "node:assert/strict";
import test from "node:test";

import { CINEMATIC_DURATION, menuEntrance, screenPoses } from "../components/loguin/cinematicTimeline.js";

test("el arrastre muestra ambas pantallas a distinta profundidad y asienta el menú a tamaño completo", () => {
  const initial = screenPoses(0);
  const overlap = screenPoses(750);
  const end = screenPoses(CINEMATIC_DURATION);
  assert.equal(initial.loginScale, 1);
  assert.ok(initial.menuX > 1);
  assert.ok(overlap.loginX > -1 && overlap.loginX < 0);
  assert.ok(overlap.menuX > 0 && overlap.menuX < 1);
  assert.ok(overlap.loginYaw > 0 && overlap.menuYaw < 0);
  assert.ok(overlap.mist > 0 && overlap.rim > 0);
  assert.ok(end.loginX < -1);
  for (const key of ["menuX", "menuY", "menuYaw", "menuPitch", "mist", "rim"]) {
    assert.ok(Math.abs(end[key]) < 1e-8, key);
  }
  assert.equal(end.menuScale, 1);
});

test("el encabezado, las tarjetas y los servicios entran sucesivamente y terminan estables", () => {
  assert.ok(menuEntrance(1160, 0) > menuEntrance(1160, 85));
  assert.ok(menuEntrance(1160, 85) > menuEntrance(1160, 165));
  for (const offset of [0, 85, 165]) assert.equal(menuEntrance(CINEMATIC_DURATION, offset), 1);
});
