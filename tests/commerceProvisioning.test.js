import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createWebsiteService,
  getWebsiteProgress,
  hasEmpresaWebsiteAccess,
  normalizeWebsiteSlug,
  WEBSITE_ACTIONS,
  WEBSITE_STATUS_LABELS,
} from "../services/commerceProvisioning.js";

const companyUser = {
  _id: "company-fixture",
  modoEmpresa: true,
  empresaTerminosCondicionesAcepted: true,
  profile: { roleComercio: ["EMPRESA"] },
};
const step = (id, status) => ({ id, label: id, status });

test("el acceso exige modo empresa, términos, rol exacto y empresa no bloqueada", () => {
  assert.equal(hasEmpresaWebsiteAccess(companyUser), true);
  assert.equal(hasEmpresaWebsiteAccess({ ...companyUser, profile: { roleComercio: "EMPRESA" } }), true);
  for (const user of [
    null,
    { ...companyUser, modoEmpresa: false },
    { ...companyUser, empresaBloqueada: true },
    { ...companyUser, empresaTerminosCondicionesAcepted: false },
    { ...companyUser, profile: { roleComercio: "NO_EMPRESA" } },
    { ...companyUser, profile: { roleComercio: ["CLIENTE"] } },
  ]) assert.equal(hasEmpresaWebsiteAccess(user), false);
});

test("normaliza el subdominio exactamente como el FE web", () => {
  const webSource = readFileSync(new URL("../../react-download/imports/ui/pages/empresa/index.jsx", import.meta.url), "utf8");
  const slugifySource = webSource.match(/const slugify = \(value\) => ([\s\S]*?);/)?.[1];
  assert.ok(slugifySource);
  // Fuente local de confianza; compara el contrato vigente entre los clientes.
  const webSlugify = new Function("value", `return ${slugifySource};`);
  for (const value of [" Mi Tiénda! ", "A B", "---tienda---", "tien_da", "a".repeat(45), "", "Árbol & Café"]) {
    assert.equal(normalizeWebsiteSlug(value), webSlugify(value));
  }
});

test("el progreso de instalación usa pasos publicados y distingue rollback de éxito", () => {
  const progress = getWebsiteProgress({
    status: "APROVISIONANDO",
    steps: [step("dns", "COMPLETADO"), step("certificate", "EN_PROGRESO"), step("https", "PENDIENTE")],
  });
  assert.equal(progress.completedCount, 1);
  assert.equal(progress.total, 3);
  assert.equal(progress.percent, 33);
  assert.equal(progress.label, WEBSITE_STATUS_LABELS.APROVISIONANDO);
  assert.equal(getWebsiteProgress({ status: "COMPLETADA" }).percent, 100);
  assert.equal(getWebsiteProgress({ status: "COMPLETADA" }).canClose, true);
  assert.equal(getWebsiteProgress({ status: "PENDIENTE_DNS" }).canCancel, true);
  assert.equal(getWebsiteProgress({ status: "FALLIDA" }).showRollback, true);
  assert.equal(getWebsiteProgress({ status: "ROLLBACK_FALLIDO" }).showRollback, true);
  assert.equal(getWebsiteProgress({ status: "FALLIDA" }).canCancel, false);
  assert.equal(getWebsiteProgress({ status: "CANCELADA", steps: [step("dns", "COMPLETADO")] }).completedCount, 0);
  assert.equal(getWebsiteProgress({ status: "CANCELADA" }).percent, 0);
});

test("el progreso del cierre no cuenta los pasos de instalación", () => {
  const progress = getWebsiteProgress({
    status: "CERRANDO",
    steps: [step("install", "COMPLETADO")],
    closeSteps: [step("pm2", "COMPLETADO"), step("nginx", "EN_PROGRESO")],
  });
  assert.equal(progress.completedCount, 1);
  assert.equal(progress.total, 2);
  assert.equal(progress.percent, 50);
  assert.equal(getWebsiteProgress({ status: "CERRADA" }).percent, 100);
});

test("solo permite adelantar cierres operativos y nunca bloqueos de seguridad", () => {
  const waiting = {
    status: "CERRANDO",
    currentStep: "close:auto_retry_wait",
    closeAutoRetryPolicyVersion: 1,
    closeAutoRetryBlocked: false,
    closeSucceeded: null,
  };
  assert.equal(getWebsiteProgress(waiting).canRetryClose, true);
  for (const changed of [
    { status: "CIERRE_FALLIDO" },
    { status: "FALLIDA" },
    { currentStep: "close:manual_retry_queued" },
    { closeAutoRetryPolicyVersion: 0 },
    { closeAutoRetryBlocked: true },
    { closeSucceeded: true },
    { closeSucceeded: false },
  ]) assert.equal(getWebsiteProgress({ ...waiting, ...changed }).canRetryClose, false);
  assert.equal(getWebsiteProgress({ ...waiting, currentStep: "close:manual_retry_queued" }).manualRetryQueued, true);
  assert.equal(getWebsiteProgress({ ...waiting, status: "CIERRE_FALLIDO", closeAutoRetryBlocked: true }).label, "Cierre incompleto; requiere revisión");
  assert.equal(getWebsiteProgress({ status: "CIERRE_FALLIDO" }).label, "Cierre incompleto; recuperación automática");
});

const fakeMeteor = ({ connected = true, userId = "company-fixture", error, result = { success: true }, noReply = false } = {}) => {
  const calls = [];
  return {
    calls,
    userId: () => userId,
    status: () => ({ connected }),
    call: (method, ...args) => {
      const callback = args.pop();
      calls.push({ method, args });
      if (!noReply) callback(error, result);
    },
  };
};

test("usa los métodos y payloads de la web sin invocar contratos de administración", async () => {
  const meteor = fakeMeteor();
  const service = createWebsiteService(meteor);
  await service.create({ displayName: "  Mi   tienda  ", slug: "Mi Tiénda" });
  for (const action of ["cancel", "close", "retryClose"]) await service.perform(action, "request-fixture");
  assert.deepEqual(meteor.calls, [
    { method: "comercio.provisioning.create", args: [{ displayName: "Mi tienda", slug: "mi-tienda" }] },
    { method: "comercio.provisioning.cancelMine", args: ["request-fixture"] },
    { method: "comercio.provisioning.closeMine", args: ["request-fixture"] },
    { method: "comercio.provisioning.retryCloseMine", args: ["request-fixture"] },
  ]);
  assert.equal(Object.keys(WEBSITE_ACTIONS).length, 3);
  await assert.rejects(service.perform("admin.retry", "request-fixture"), /no es válida/);
  await assert.rejects(service.perform("__proto__", "request-fixture"), /no es válida/);
  await assert.rejects(service.perform("close", ""), /no es válida/);
  assert.equal(meteor.calls.length, 4);
});

test("conserva la respuesta idempotente de creación y propaga errores del backend", async () => {
  const duplicate = { success: true, created: false, hostname: "store.example.test" };
  assert.deepEqual(await createWebsiteService(fakeMeteor({ result: duplicate })).create({ displayName: "Store", slug: "store" }), duplicate);
  const denied = { error: "forbidden", reason: "Solo el propietario puede continuar." };
  await assert.rejects(
    createWebsiteService(fakeMeteor({ error: denied })).perform("close", "request-fixture"),
    (error) => error === denied,
  );
  await assert.rejects(
    createWebsiteService(fakeMeteor({ result: { success: false, reason: "La solicitud cambió." } })).perform("close", "request-fixture"),
    /La solicitud cambió/,
  );
});

test("sin sesión o conexión no envía operaciones y un timeout no produce reintentos", async () => {
  for (const options of [{ connected: false }, { userId: null }]) {
    const meteor = fakeMeteor(options);
    await assert.rejects(createWebsiteService(meteor).perform("cancel", "request-fixture"));
    assert.equal(meteor.calls.length, 0);
  }
  const meteor = fakeMeteor({ noReply: true });
  await assert.rejects(createWebsiteService(meteor, 5).perform("close", "request-fixture"), /Revisa el estado/);
  assert.equal(meteor.calls.length, 1);
});

test("la ruta, el drawer y la colección quedan conectados al flujo compartido", () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
  assert.match(read("../app/(empresa)/PaginasWeb.tsx"), /screens\/PaginasWebScreen/);
  assert.match(read("../app/(empresa)/_layout.tsx"), /Stack.Screen name="PaginasWeb"/);
  assert.match(read("../components/empresa/EmpresaDrawerContent.native.jsx"), /hasEmpresaWebsiteAccess\(user\)/);
  assert.match(read("../components/empresa/EmpresaDrawerContent.native.jsx"), /\/\(empresa\)\/PaginasWeb/);
  assert.match(read("../components/collections/collections.js"), /new Mongo.Collection\(\s*"COMERCIO_provisioning_requests"/);
  const screen = read("../components/empresa/screens/EmpresaWebsitesScreen.jsx");
  assert.match(screen, /Meteor.subscribe\("comercio.empresaAccess"\)/);
  assert.match(screen, /Meteor.subscribe\("comercio.provisioning.mine"\)/);
  assert.match(screen, /ownerId: userId/);
  assert.match(screen, /handles.forEach\(\(handle\) => handle.stop\(\)\)/);
});
