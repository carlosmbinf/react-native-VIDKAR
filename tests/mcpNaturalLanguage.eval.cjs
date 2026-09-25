const { spawnSync } = require("node:child_process");
const { createRequire } = require("node:module");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Evaluación opt-in: solo tools/list del código local, nunca tools/call ni datos reales.
async function main() {
  if (process.platform !== "darwin") throw new Error("Requiere macOS y Apple Intelligence disponible.");
  const backend = path.resolve(__dirname, "../../react-download");
  const backendRequire = createRequire(path.join(backend, "package.json"));
  const { Client } = await import(backendRequire.resolve("@modelcontextprotocol/sdk/client/index.js"));
  const { StdioClientTransport } = await import(backendRequire.resolve("@modelcontextprotocol/sdk/client/stdio.js"));
  const client = new Client({ name: "vidkar-local-planner-eval", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(backend, "mcp/server.mjs")],
    env: { PATH: process.env.PATH, HOME: process.env.HOME, MCP_TRANSPORT: "stdio" },
    stderr: "pipe",
  });
  let tools;
  try {
    await client.connect(transport);
    tools = (await client.listTools()).tools.map((tool) => ({ ...tool, readOnly: tool.annotations?.readOnlyHint === true }));
  } finally {
    await client.close();
  }
  tools.push({ name: "library_schedule_future_tool", description: "Consulta el horario de la biblioteca de una ciudad.",
    readOnly: true, annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: { city: { type: "string", minLength: 1 } }, required: ["city"], additionalProperties: false } });
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-ai-eval-"));
  try {
    const catalogPath = path.join(directory, "catalog.json");
    fs.writeFileSync(catalogPath, JSON.stringify(tools));
    const executable = path.join(directory, "evaluate");
    const build = spawnSync("xcrun", ["swiftc", "-swift-version", "5", "-o", executable,
      path.join(__dirname, "../modules/vidkar-mcp/ios/MCPQueryPolicy.swift"),
      path.join(__dirname, "../modules/vidkar-mcp/ios/MCPNaturalLanguagePlanner.swift"),
      path.join(__dirname, "MCPNaturalLanguageEvaluation.swift")], { encoding: "utf8" });
    if (build.status !== 0) throw new Error(build.stderr);
    const result = spawnSync(executable, [catalogPath], { stdio: "inherit" });
    process.exitCode = result.status ?? 1;
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });