import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { shouldHideCommerceHomeSection } from "../services/commerceHomeVisibility.js";

const completedEmptySearch = {
  hasLocation: true,
  isLoading: false,
  locationError: null,
  locationUnavailable: false,
  query: "",
  searchStatus: "success",
  storeCount: 0,
};

test("oculta la sección después de una búsqueda válida sin tiendas cercanas", () => {
  assert.equal(shouldHideCommerceHomeSection(completedEmptySearch), true);
});

test("mantiene el módulo mientras carga, hay error, ubicación no disponible o filtro activo", () => {
  assert.equal(shouldHideCommerceHomeSection({ ...completedEmptySearch, isLoading: true }), false);
  assert.equal(shouldHideCommerceHomeSection({ ...completedEmptySearch, searchStatus: "error" }), false);
  assert.equal(shouldHideCommerceHomeSection({ ...completedEmptySearch, locationUnavailable: true }), false);
  assert.equal(shouldHideCommerceHomeSection({ ...completedEmptySearch, locationError: "Permiso denegado" }), false);
  assert.equal(shouldHideCommerceHomeSection({ ...completedEmptySearch, query: "pizza" }), false);
  assert.equal(shouldHideCommerceHomeSection({ ...completedEmptySearch, storeCount: 2 }), false);
  assert.equal(shouldHideCommerceHomeSection({ ...completedEmptySearch, hasLocation: false }), false);
});

test("el carrito usa el drawer compartido y coordina su gesto con el scroll interno", () => {
  const cartDialog = readFileSync(new URL("../components/productos/AddToCartDialog.native.jsx", import.meta.url), "utf8");
  const homeSection = readFileSync(new URL("../components/productos/ComercioHomeSection.native.jsx", import.meta.url), "utf8");

  assert.match(cartDialog, /<DrawerBottom/);
  assert.match(cartDialog, /contentAtTopRef=\{contentAtTopRef\}/);
  assert.match(cartDialog, /scrollable/);
  assert.match(cartDialog, /reducedMotion=\{reducedMotion\}/);
  assert.doesNotMatch(cartDialog, /<Dialog(?:\s|\.)/);
  assert.match(homeSection, /shouldHideCommerceHomeSection/);
});
