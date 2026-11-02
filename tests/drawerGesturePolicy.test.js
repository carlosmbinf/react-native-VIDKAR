import assert from "node:assert/strict";
import test from "node:test";

import { canStartDrawerDrag } from "../components/drawer/drawerGesturePolicy.js";

const downwardDrag = {
  atTop: true,
  enabled: true,
  isBottom: true,
  startedAtTop: true,
  dx: 1,
  dy: 20,
};

test("un arrastre hacia abajo puede mover el drawer si comenzó en el tope", () => {
  assert.equal(canStartDrawerDrag(downwardDrag), true);
});

test("el drawer no se mueve mientras el contenido está desplazado", () => {
  assert.equal(canStartDrawerDrag({ ...downwardDrag, atTop: false }), false);
});

test("llegar al tope durante el mismo arrastre requiere un gesto nuevo", () => {
  assert.equal(canStartDrawerDrag({ ...downwardDrag, startedAtTop: false }), false);
});

test("deslizar horizontalmente o hacia arriba no cierra el drawer", () => {
  assert.equal(canStartDrawerDrag({ ...downwardDrag, dx: 30, dy: 10 }), false);
  assert.equal(canStartDrawerDrag({ ...downwardDrag, dy: -20 }), false);
  assert.equal(canStartDrawerDrag({ ...downwardDrag, dy: 4 }), false);
});

test("el gesto respeta la opción de cierre y el tipo de drawer", () => {
  assert.equal(canStartDrawerDrag({ ...downwardDrag, enabled: false }), false);
  assert.equal(canStartDrawerDrag({ ...downwardDrag, isBottom: false }), false);
});
