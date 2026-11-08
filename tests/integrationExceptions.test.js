import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isPrincipalAdmin } from "../services/mcp/mcpAccess.js";
import {
  EXCEPTION_METHODS, exceptionDate, exceptionErrorLabel, exceptionFailure,
  exceptionGroupKey, exceptionGroupLabel, exceptionValue,
} from "../services/integrationExceptions.js";

test("solo el administrador principal tiene acceso, no otros administradores", () => {
  assert.equal(isPrincipalAdmin({ username: " CarlosMBinf " }), true);
  for (const user of [null, { username: "otro", profile: { role: "admin" } }, { profile: { role: "admin" } }]) {
    assert.equal(isPrincipalAdmin(user), false);
  }
  const drawer = readFileSync(new URL("../components/drawer/DrawerOptionsAlls.js", import.meta.url), "utf8");
  assert.match(drawer, /const buildPrivateItems = \(\) => \[\s*\{[\s\S]*?href: "\/\(normal\)\/Excepciones"/);
  assert.match(drawer, /if \(isSuperAdmin\)[\s\S]*?items: buildPrivateItems\(\)/);
  const screen = readFileSync(new URL("../components/exceptions/ExceptionsScreen.jsx", import.meta.url), "utf8");
  assert.match(screen, /if \(isPrincipalAdmin\(user\)\) return <ExceptionsBrowser key=\{userId\}/);
  assert.match(screen, /key=\{selectedId\} id=\{selectedId\}/);
});

test("usa métodos agrupados, filas seleccionables y paginación independiente", () => {
  assert.equal(EXCEPTION_METHODS.groups, "integraciones.excepciones.productos");
  assert.equal(EXCEPTION_METHODS.records, "integraciones.excepciones.registrosProducto");
  assert.equal(EXCEPTION_METHODS.detail, "integraciones.excepciones.detalle");
  const screen = readFileSync(new URL("../components/exceptions/ExceptionsScreen.jsx", import.meta.url), "utf8");
  assert.match(screen, /call\(EXCEPTION_METHODS.records, selected.group, \{ page, search \}\)/);
  assert.match(screen, /call\(EXCEPTION_METHODS.groups, \{ page, search \}\)/);
  assert.match(screen, /<DataTable.Row/);
  assert.match(screen, /if \(selected\) setSelectedId\(entry._id\)/);
  assert.match(screen, /setRecordPage\(1\); setSelected\(entry\)/);
  assert.match(screen, /return \(\) => \{ active = false; \}/);
});

test("etiquetas y claves distinguen productos, publicaciones y registros sin producto", () => {
  const group = { integration: "mercadolibre", type: "product", id: "product1" };
  assert.equal(exceptionGroupLabel({ group, productName: "Producto" }), "Producto");
  assert.equal(exceptionGroupLabel({ group }), "product1");
  assert.equal(exceptionGroupLabel({ group: { ...group, type: "unassigned", id: "" } }), "Sin producto identificado");
  assert.notEqual(exceptionGroupKey(group), exceptionGroupKey({ ...group, type: "item" }));
  assert.notEqual(exceptionGroupKey(group), exceptionGroupKey({ ...group, integration: "other" }));
  assert.equal(exceptionErrorLabel({ code: "invalid_token", name: "Error" }), "invalid_token");
  assert.equal(exceptionErrorLabel({ name: "TypeError" }), "TypeError");
  assert.equal(exceptionErrorLabel(null), "Error");
});

test("muestra datos seguros, ausencias y errores explícitos de backend", () => {
  assert.equal(exceptionDate("invalid"), "—");
  assert.equal(exceptionDate(null), "—");
  assert.notEqual(exceptionDate("2026-01-01T00:00:00.000Z"), "—");
  assert.equal(exceptionValue(false), "No");
  assert.equal(exceptionValue(true), "Sí");
  assert.equal(exceptionValue(0), "0");
  assert.equal(exceptionValue(null), "—");
  assert.match(exceptionValue({ attempt: 2 }), /"attempt": 2/);
  assert.match(exceptionFailure({ error: 404 }, "Error"), /Actualiza el backend/);
  assert.equal(exceptionFailure({ reason: "Sin autorización" }, "Error"), "Sin autorización");
  assert.equal(exceptionFailure(null, "Error al cargar"), "Error al cargar");
});
