import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isPrincipalAdmin } from "../services/mcp/mcpAccess.js";
import {
  EXCEPTION_METHODS, exceptionDate, exceptionErrorLabel, exceptionFailure,
  exceptionGroupKey, exceptionGroupLabel, exceptionValue, groupExceptionRecords, loadExceptionGroups,
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

test("usa solo métodos existentes, filas seleccionables y paginación local independiente", () => {
  assert.deepEqual(Object.keys(EXCEPTION_METHODS).sort(), ["detail", "list"]);
  assert.equal(EXCEPTION_METHODS.list, "integraciones.excepciones.listar");
  assert.equal(EXCEPTION_METHODS.detail, "integraciones.excepciones.detalle");
  const screen = readFileSync(new URL("../components/exceptions/ExceptionsScreen.jsx", import.meta.url), "utf8");
  assert.match(screen, /loadExceptionGroups\(call, \{ search, isActive: \(\) => active/);
  assert.match(screen, /entries.slice\(\(page - 1\) \* EXCEPTION_PAGE_SIZE, page \* EXCEPTION_PAGE_SIZE\)/);
  assert.match(screen, /}, \[search, refresh\]\)/);
  assert.doesNotMatch(screen, /EXCEPTION_METHODS.(records|groups)/);
  assert.match(screen, /<DataTable.Row/);
  assert.match(screen, /if \(selected\) setSelectedId\(entry._id\)/);
  assert.match(screen, /setRecordPage\(1\); setSelectedKey\(exceptionGroupKey\(entry.group\)\)/);
  assert.match(screen, /return \(\) => \{ active = false; \}/);
});

test("etiquetas y claves distinguen productos, publicaciones y registros sin producto", () => {
  const group = { integration: "mercadolibre", type: "product", id: "product1" };
  assert.equal(exceptionGroupLabel({ group }), "Producto product1");
  assert.equal(exceptionGroupLabel({ group: { ...group, type: "item" } }), "Publicación product1");
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
  assert.equal(exceptionFailure({ error: 404, reason: "Método no disponible" }, "Error"), "Método no disponible");
  assert.equal(exceptionFailure({ reason: "Sin autorización" }, "Error"), "Sin autorización");
  assert.equal(exceptionFailure(null, "Error al cargar"), "Error al cargar");
});

const record = (_id, context, integration = "mercadolibre") => ({
  _id, integration, createdAt: new Date(2026, 0, 1, 0, Number(_id.replace(/\D/g, "")) || 0).toISOString(),
  context, error: { code: `error_${_id}` },
});

const legacyBackend = (records) => {
  const calls = [];
  let running = 0;
  let maxRunning = 0;
  const call = async (method, input) => {
    calls.push({ method, input });
    if (method === EXCEPTION_METHODS.list) {
      const pageRecords = [...records].reverse().slice((input.page - 1) * 20, input.page * 20);
      return {
        items: pageRecords.map(({ context, ...entry }) => ({ ...entry, context: {
          itemId: context.itemId, resource: context.resource,
        } })),
        total: records.length, pageSize: 20,
      };
    }
    assert.equal(method, EXCEPTION_METHODS.detail);
    running += 1;
    maxRunning = Math.max(maxRunning, running);
    await new Promise((resolve) => setTimeout(resolve, 1));
    running -= 1;
    return records.find((entry) => entry._id === input);
  };
  return { calls, call, maxRunning: () => maxRunning };
};

test("carga todas las páginas del contrato web y recupera el producto omitido en el listado", async () => {
  const records = Array.from({ length: 45 }, (_, index) => record(`record${index}`,
    index % 4 === 0 ? { productId: "product1", itemId: "MLU1" }
      : index % 4 === 1 ? { productId: "product1", itemId: "MLU2" }
        : index % 4 === 2 ? { resource: "/items/MLU1" } : { path: "/items/MLU2/prices" }));
  const { calls, call, maxRunning } = legacyBackend(records);
  const progress = [];
  const groups = await loadExceptionGroups(call, { search: "stock.*", onProgress: (value) => progress.push(value) });
  assert.deepEqual(calls.filter((entry) => entry.method === EXCEPTION_METHODS.list).map((entry) => entry.input),
    [1, 2, 3].map((page) => ({ page, search: "stock.*" })));
  assert.equal(calls.filter((entry) => entry.method === EXCEPTION_METHODS.detail).length, 45);
  assert.equal(maxRunning(), 4);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].group.id, "product1");
  assert.equal(groups[0].count, 45);
  assert.equal(groups[0].latestError.code, "error_record44");
  assert.equal(groups[0].records[0]._id, "record44");
  assert.equal(groups[0].records.slice(20, 40).length, 20);
  assert.equal(groups[0].records.slice(40, 60).length, 5);
  assert.equal(progress.at(-1), "Identificando productos: 45 de 45");
});

test("conserva publicaciones y registros sin producto y no cruza integraciones ni vínculos ambiguos", () => {
  const records = [
    record("record1", { productId: "product1", itemId: "MLU1" }),
    record("record2", { itemId: "MLU1" }),
    record("record3", { itemId: "MLU404" }),
    record("record4", { resource: "/orders/123" }),
    record("record5", {}),
    record("record6", { itemId: "MLU1" }, "other"),
    record("record7", { productId: "product2", itemId: "MLU2" }),
    record("record8", { productId: "product3", itemId: "MLU2" }),
    record("record9", { itemId: "MLU2" }),
  ];
  const originalOrder = records.map((entry) => entry._id);
  const groups = groupExceptionRecords(records);
  assert.deepEqual(records.map((entry) => entry._id), originalOrder);
  assert.equal(groups.reduce((sum, entry) => sum + entry.count, 0), 9);
  assert.equal(groups.find((entry) => entry.group.id === "product1").count, 2);
  assert.equal(groups.find((entry) => entry.group.type === "unassigned").count, 2);
  assert.equal(groups.find((entry) => entry.group.integration === "other").group.type, "item");
  assert.equal(groups.find((entry) => entry.group.id === "MLU2").count, 1);
  assert.equal(groups.find((entry) => entry.group.id === "MLU404").group.type, "item");
});

test("una búsqueda vacía de resultados no consulta detalles", async () => {
  const { call, calls } = legacyBackend([]);
  assert.deepEqual(await loadExceptionGroups(call), []);
  assert.deepEqual(calls, [{ method: EXCEPTION_METHODS.list, input: { page: 1, search: "" } }]);
});

test("una excepción antigua sin contexto permanece en el grupo sin producto", async () => {
  const summary = record("record1", {});
  const groups = await loadExceptionGroups(async (method) => method === EXCEPTION_METHODS.list
    ? { items: [summary], total: 1, pageSize: 20 }
    : { _id: summary._id });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].group.type, "unassigned");
  assert.equal(groups[0].count, 1);
});

test("propaga fallos de listado o detalle sin presentar grupos parciales ni iniciar más trabajo", async () => {
  const records = Array.from({ length: 25 }, (_, index) => record(`record${index}`, { productId: "product1" }));
  const backend = legacyBackend(records);
  await assert.rejects(loadExceptionGroups(async (method, input) => {
    if (method === EXCEPTION_METHODS.list && input.page === 2) throw new Error("Sin conexión");
    return backend.call(method, input);
  }), /Sin conexión/);
  assert.equal(backend.calls.filter((entry) => entry.method === EXCEPTION_METHODS.detail).length, 0);
  const detailCalls = [];
  await assert.rejects(loadExceptionGroups(async (method, input) => {
    if (method === EXCEPTION_METHODS.detail) {
      detailCalls.push(input);
      throw Object.assign(new Error("Sin autorización"), { error: "not-authorized" });
    }
    return backend.call(method, input);
  }), { error: "not-authorized" });
  assert.equal(detailCalls.length, 4);
});

test("cancelar impide solicitar más páginas o detalles de una sesión anterior", async () => {
  const records = Array.from({ length: 25 }, (_, index) => record(`record${index}`, { productId: "product1" }));
  const backend = legacyBackend(records);
  let active = true;
  const result = await loadExceptionGroups(async (...args) => {
    const result = await backend.call(...args);
    active = false;
    return result;
  }, { isActive: () => active });
  assert.equal(result, null);
  assert.equal(backend.calls.length, 1);

  const secondBackend = legacyBackend(records);
  active = true;
  const cancelledDetails = await loadExceptionGroups(async (method, input) => {
    const result = await secondBackend.call(method, input);
    if (method === EXCEPTION_METHODS.detail) active = false;
    return result;
  }, { isActive: () => active });
  assert.equal(cancelledDetails, null);
  assert.equal(secondBackend.calls.filter((entry) => entry.method === EXCEPTION_METHODS.detail).length, 4);
});

test("rechaza respuestas inválidas, páginas incompletas, duplicados o un listado que cambia", async () => {
  for (const result of [null, {}, { items: [], total: 1, pageSize: 20 }, { items: [], total: -1, pageSize: 20 },
    { items: [], total: 0, pageSize: 0 }, { items: [null], total: 1, pageSize: 20 },
    { items: [record("record1", {}), record("record1", {})], total: 2, pageSize: 20 }]) {
    await assert.rejects(loadExceptionGroups(async () => result), /no es válido|cambió/);
  }
  const backend = legacyBackend(Array.from({ length: 25 }, (_, index) => record(`record${index}`, {})));
  await assert.rejects(loadExceptionGroups(async (method, input) => {
    const result = await backend.call(method, input);
    return input.page === 2 ? { ...result, total: 26 } : result;
  }), /cambió durante la carga/);
  await assert.rejects(loadExceptionGroups(async (method) => method === EXCEPTION_METHODS.list
    ? { items: [record("record1", {})], total: 1, pageSize: 20 }
    : { _id: "other", context: {} }), /contexto.*no es válido/);
});

test("avisa cuando la búsqueda supera el máximo del listado existente en lugar de truncarla", async () => {
  let calls = 0;
  await assert.rejects(loadExceptionGroups(async () => {
    calls += 1;
    return { items: Array.from({ length: 20 }, (_, index) => record(`record${index}`, {})), total: 200001, pageSize: 20 };
  }), /supera el límite de páginas/);
  assert.equal(calls, 1);
});
