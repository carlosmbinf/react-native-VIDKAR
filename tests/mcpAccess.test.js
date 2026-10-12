import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isMCPAdmin, isPrincipalAdmin } from "../services/mcp/mcpAccess.js";

test("la aprobación administrativa de liquidaciones queda reservada al principal", () => {
  assert.equal(isPrincipalAdmin({ username: "CarlosMBInf" }), true);
  assert.equal(isPrincipalAdmin({ username: " administrador ", profile: { role: "admin" } }), false);
  assert.equal(isPrincipalAdmin({ username: "cliente", profile: { role: "user" } }), false);
  assert.equal(isPrincipalAdmin(null), false);
});

test("Saldos y pagos está en el menú normal y comparte pantalla en los tres modos", () => {
  const drawer = readFileSync(new URL("../components/drawer/DrawerOptionsAlls.js", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../app/(normal)/_layout.tsx", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/(normal)/LiquidacionesAdmin.tsx", import.meta.url), "utf8");
  const empresaRoute = readFileSync(new URL("../app/(empresa)/FondosCobros.tsx", import.meta.url), "utf8");
  const cadeteRoute = readFileSync(new URL("../app/(cadete)/SaldosPagos.tsx", import.meta.url), "utf8");
  const cadeteLayout = readFileSync(new URL("../app/(cadete)/_layout.tsx", import.meta.url), "utf8");
  const serviceItems = drawer.slice(
    drawer.indexOf("const buildServiceItems"),
    drawer.indexOf("const buildCinemaItems"),
  );
  const adminItems = drawer.slice(
    drawer.indexOf("const buildAdminItems"),
    drawer.indexOf("const buildProfessorItems"),
  );

  assert.match(serviceItems, /label: "Saldos y pagos"[\s\S]*href: "\/\(normal\)\/LiquidacionesAdmin"/);
  assert.doesNotMatch(adminItems, /Saldos y pagos/);
  assert.match(layout, /<Stack\.Screen name="LiquidacionesAdmin"/);
  assert.match(route, /LiquidacionesAdminScreen/);
  assert.match(empresaRoute, /LiquidacionesAdminScreen/);
  assert.match(cadeteRoute, /LiquidacionesAdminScreen/);
  assert.match(cadeteLayout, /<Stack\.Screen name="SaldosPagos"/);
});

test("solo los administradores y el admin principal pueden abrir MCP", () => {
  assert.equal(isMCPAdmin({ profile: { role: "admin" } }), true);
  assert.equal(isMCPAdmin({ username: "CarlosMBInf" }), true);
  assert.equal(isMCPAdmin({ username: "cliente", profile: { role: "user" } }), false);
  assert.equal(isMCPAdmin(null), false);
});

test("el perfil mobile enlaza a la pantalla MCP y conserva el shell de origen", () => {
  const profile = readFileSync(new URL("../components/users/UserDetails.native.js", import.meta.url), "utf8");
  const settings = readFileSync(new URL("../components/mcp/MCPSettingsScreen.native.jsx", import.meta.url), "utf8");
  const empresaRoute = readFileSync(new URL("../app/(empresa)/MCPSettings.tsx", import.meta.url), "utf8");

  assert.match(profile, /McpSettingsLinkCard/);
  assert.match(profile, /isAdminUser && item\?\._id === currentUserId/);
  assert.match(profile, /"\/\(empresa\)\/MCPSettings"/);
  assert.match(profile, /"\/\(normal\)\/MCPSettings"/);
  assert.match(settings, /backHref = "\/\(normal\)\/Main"/);
  assert.match(settings, /backHref=\{backHref\}/);
  assert.match(empresaRoute, /backHref="\/\(empresa\)\/EmpresaNavigator"/);
});
