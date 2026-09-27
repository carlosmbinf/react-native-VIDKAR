import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isMCPAdmin } from "../services/mcp/mcpAccess.js";

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
