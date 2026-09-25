import assert from "node:assert/strict";
import test from "node:test";
import "./mcpSnapshot.test.js";

import {
  buildToolCallRequest,
  describeHTTPError,
  extractToolResult,
  formatToolCatalog,
  parseArgumentsJSON,
} from "../services/mcp/mcpProtocol.js";

test("construye tools/call para get_users con argumentos JSON", () => {
  const args = parseArgumentsJSON('{"limit":100,"offset":0,"sort":"newest"}');
  assert.deepEqual(buildToolCallRequest("get_users", args), {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "get_users", arguments: args },
  });
});

test("construye tools/call para get_sales", () => {
  const args = parseArgumentsJSON('{"period":"today","paidOnly":true}');
  assert.equal(buildToolCallRequest("get_sales", args).params.name, "get_sales");
  assert.deepEqual(buildToolCallRequest("get_sales", args).params.arguments, args);
});

test("rechaza argumentos JSON inválidos y no objeto", () => {
  assert.throws(() => parseArgumentsJSON("{invalid"), /JSON válido/);
  assert.throws(() => parseArgumentsJSON("[]"), /objeto JSON/);
  assert.throws(() => buildToolCallRequest("get_users", []), /objeto JSON/);
});

test("preserva exactamente el texto JSON de content", () => {
  const output = '{"success":true,"users":[{"_id":"u1"}]}';
  assert.equal(extractToolResult({ result: { content: [{ type: "text", text: output }] } }), output);
});

test("devuelve error legible para JSON-RPC", () => {
  assert.throws(
    () => extractToolResult({ error: { code: -32602, message: "Invalid params" } }),
    /MCP JSON-RPC -32602: Invalid params/,
  );
});

test("devuelve error legible para isError", () => {
  assert.throws(
    () => extractToolResult({ result: { isError: true, content: [{ type: "text", text: "Tool not found" }] } }),
    /Tool not found/,
  );
});

test("describe errores HTTP con y sin cuerpo", () => {
  assert.equal(describeHTTPError(401, '{"error":"MCP_UNAUTHORIZED"}'), 'MCP HTTP 401: {"error":"MCP_UNAUTHORIZED"}');
  assert.match(describeHTTPError(504), /MCP HTTP 504/);
});

test("formatea catálogo con método, descripción y schema", () => {
  assert.deepEqual(JSON.parse(formatToolCatalog([
    {
      name: "get_users",
      description: "Devuelve usuarios disponibles",
      inputSchema: { type: "object" },
      permissions: ["authenticated", "token-owner-scope"],
      dataClass: "private-or-financial",
      readOnly: true,
      requiresConfirmation: true,
    },
  ])), [{
    name: "get_users",
    description: "Devuelve usuarios disponibles",
    inputSchema: { type: "object" },
    permissions: ["authenticated", "token-owner-scope"],
    dataClass: "private-or-financial",
    readOnly: true,
    requiresConfirmation: true,
  }]);
});

test("clasifica herramientas antiguas sin metadatos como no ejecutables", () => {
  const tool = JSON.parse(formatToolCatalog([{ name: "future_tool" }]))[0];
  assert.equal(tool.readOnly, false);
  assert.equal(tool.requiresConfirmation, true);
  assert.equal(tool.dataClass, "unclassified");
});
