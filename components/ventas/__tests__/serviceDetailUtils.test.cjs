/* global __dirname */
// Ejecutar con: node --experimental-vm-modules --test components/ventas/__tests__/serviceDetailUtils.test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { SourceTextModule } = require("node:vm");

// Carga los helpers reales con los imports sin extensión usados por Metro.
const cache = new Map();
async function loadModule(filename) {
  if (cache.has(filename)) return cache.get(filename);
  const module = new SourceTextModule(fs.readFileSync(filename, "utf8"), { identifier: filename });
  cache.set(filename, module);
  await module.link((specifier, parent) => loadModule(path.resolve(path.dirname(parent.identifier), `${specifier}.js`)));
  return module;
}
const model = loadModule(path.resolve(__dirname, "../serviceDetailUtils.js")).then(async (module) => {
  await module.evaluate();
  return module.namespace.getServiceDetail;
});

test("Proxy por tiempo muestra meses y datos ilimitados, no tiempo infinito", async () => {
  const detail = (await model)({ type: "PROXY", esPorTiempo: true, cantidad: 3, megas: null, nombre: "Cuenta de prueba", cobrarUSD: "150", monedaACobrar: "CUP" });
  assert.equal(detail.highlight, "Ilimitados");
  assert.ok(detail.fields.some((field) => field.value === "3 meses"));
  assert.ok(detail.fields.some((field) => field.label === "Cuenta"));
  assert.ok(!detail.fields.some((field) => field.label === "Destinatario"));
  assert.equal(detail.price, "150,00 CUP");
  assert.equal(detail.priceLabel, "Precio por mes");
});

test("VPN distingue cuota cero, ausente, GB y centinela ilimitado", async () => {
  const getDetail = await model;
  assert.equal(getDetail({ type: "VPN", megas: 0 }).highlight, "0 MB");
  assert.equal(getDetail({ type: "VPN" }).highlight, "Cuota no registrada");
  assert.equal(getDetail({ type: "VPN", megas: 2048 }).highlight, "2 GB");
  assert.equal(getDetail({ type: "VPN", megas: 999999 }).highlight, "Ilimitados");
  assert.equal(getDetail({ type: "fecha-vpn", producto: { cantidad: 2 } }).highlight, "Ilimitados");
});

test("Remesa distingue monedas de origen y recepción sin asumir CUP", async () => {
  const detail = (await model)({ type: "REMESA", nombre: "Destinatario de prueba", recibirEnCuba: 90, monedaRecibirEnCuba: "EUR", cobrarUSD: "100", metodoPago: "EFECTIVO", direccionCuba: "Dirección de prueba" });
  assert.equal(detail.highlight, "90,00 EUR");
  assert.equal(detail.price, "100,00 USD");
  assert.ok(detail.fields.some((field) => field.label === "Dirección de entrega"));
  assert.ok(!detail.fields.some((field) => field.label === "Tarjeta destino"));
});

test("Remesa por tarjeta identifica transferencia", async () => {
  const detail = (await model)({ type: "REMESA", tarjetaCUP: "TARJETA-DE-PRUEBA", recibirEnCuba: 0, monedaRecibirEnCuba: "CUP" });
  assert.equal(detail.highlight, "0,00 CUP");
  assert.ok(detail.fields.some((field) => field.value === "Transferencia a tarjeta"));
});

test("Curso prioriza título y profesor; no deduce acceso vigente", async () => {
  const detail = (await model)({ type: "CURSO", nombre: "Estudiante de prueba", entregado: true, producto: { titulo: "Curso de prueba", profesorNombre: "Profesor de prueba" } });
  assert.equal(detail.title, "Curso de prueba");
  assert.equal(detail.highlight, "Suscripción al curso");
  assert.ok(detail.fields.some((field) => field.label === "Profesor"));
  assert.ok(!detail.fields.some((field) => /acceso|vigencia|destinatario/i.test(field.label)));
});

test("Comercio conserva precio unitario y recogida; no usa nombre del comprador como producto", async () => {
  const detail = (await model)({ type: "COMERCIO", nombre: "Comprador de prueba", cantidad: 3, cobrarUSD: 25, monedaACobrar: "USD", producto: { name: "Producto de prueba" }, tienda: { nombre: "Tienda de prueba" }, recogidaEnLocal: true }, { rawDoc: { direccionEntrega: "Dirección de prueba" } });
  assert.equal(detail.title, "Producto de prueba");
  assert.equal(detail.highlight, "3 unidades");
  assert.equal(detail.price, "25,00 USD");
  assert.equal(detail.priceLabel, "Precio unitario");
  assert.ok(!detail.fields.some((field) => field.label === "Dirección de entrega"));
});

test("Recarga lee destination anidado y respeta su moneda", async () => {
  const detail = (await model)({ type: "RECARGA", extraFields: { mobile_number: "MOVIL-DE-PRUEBA" }, producto: { name: "Recarga de prueba", destination: { amount: 10, currency: "USD" } } });
  assert.equal(detail.highlight, "MOVIL-DE-PRUEBA");
  assert.ok(detail.fields.some((field) => field.value === "10,00 USD"));
});

test("Tipos individuales prevalecen en ventas mixtas y desconocidos no heredan campos", async () => {
  const getDetail = await model;
  assert.equal(getDetail({ type: "CURSO" }, { category: "REMESAS" }).category, "CURSOS");
  assert.equal(getDetail({ type: "NUEVO", recibirEnCuba: 90 }, { category: "REMESAS" }).category, "OTROS");
});

test("Snapshots inválidos no producen objetos React, NaN ni precios inventados", async () => {
  const getDetail = await model;
  for (const item of [null, {}, { type: "COMERCIO", cantidad: false, cobrarUSD: "no-numérico", nombre: {}, producto: { name: {} } }]) {
    const detail = getDetail(item);
    assert.equal(typeof detail.title, "string");
    assert.equal(detail.price, "");
    assert.ok(!JSON.stringify(detail).includes("NaN"));
  }
  assert.equal(getDetail({ type: "VPN", cobrarUSD: -1 }).price, "");
  assert.equal(getDetail({ type: "VPN", entregado: "false" }).delivered, null);
});