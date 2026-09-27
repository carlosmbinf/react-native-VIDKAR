import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getVisibleHomeServices,
  normalizeHomeServices,
  serializeHomeServices,
} from "../services/homeServices.js";

test("bienvenida prioriza comercios y cubacel, dejando proxy/vpn oculto por defecto", () => {
  const services = normalizeHomeServices(undefined);
  assert.deepEqual(services.map(({ id, visible }) => ({ id, visible })), [
    { id: "COMERCIOS", visible: true },
    { id: "CUBACEL", visible: true },
    { id: "PROXY_VPN", visible: false },
  ]);
});

test("respeta el orden y visibilidad administrados y omite servicios ocultos", () => {
  const settings = [
    { id: "CUBACEL", visible: false },
    { id: "PROXY_VPN", visible: true },
    { id: "COMERCIOS", visible: true },
  ];
  assert.deepEqual(getVisibleHomeServices(settings).map(({ id }) => id), ["PROXY_VPN", "COMERCIOS"]);
  assert.deepEqual(serializeHomeServices(settings), settings);
});

test("completa configuraciones viejas y descarta ids desconocidos/duplicados", () => {
  const normalized = normalizeHomeServices([
    { id: "CUBACEL", visible: false },
    { id: "NO_EXISTE", visible: true },
    { id: "CUBACEL", visible: true },
  ]);
  assert.deepEqual(normalized.map(({ id, visible }) => ({ id, visible })), [
    { id: "CUBACEL", visible: false },
    { id: "COMERCIOS", visible: true },
    { id: "PROXY_VPN", visible: false },
  ]);
});

test("el detalle mobile abre la pantalla de servicios en el mismo shell y no monta el editor", () => {
  const profile = readFileSync(new URL("../components/users/UserDetails.native.js", import.meta.url), "utf8");
  const normalRoute = readFileSync(new URL("../app/(normal)/UserServices.tsx", import.meta.url), "utf8");
  const empresaRoute = readFileSync(new URL("../app/(empresa)/UserServices.tsx", import.meta.url), "utf8");
  const screen = readFileSync(new URL("../components/users/welcome-services-management-screen.native.jsx", import.meta.url), "utf8");

  assert.match(profile, /WelcomeServicesLinkCard/);
  assert.doesNotMatch(profile, /import WelcomeServicesCard/);
  assert.match(profile, /"\/\((empresa|normal)\)\/UserServices"/);
  assert.match(normalRoute, /profileRoute="\/\(normal\)\/User"/);
  assert.match(empresaRoute, /profileRoute="\/\(empresa\)\/User"/);
  assert.match(screen, /WelcomeServicesCard/);
  assert.match(screen, /NestableScrollContainer/);
  assert.match(screen, /currentUser\?\.profile\?\.role === "admin"/);
  assert.match(screen, /serviciosInicio: 1/);
});
