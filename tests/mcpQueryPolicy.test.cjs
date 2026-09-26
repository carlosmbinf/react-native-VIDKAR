/* global __dirname */
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

test("política Swift de consultas y aislamiento de resultados", { skip: process.platform !== "darwin" }, (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-query-policy-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const executable = path.join(directory, "policy-tests");
  const build = spawnSync("xcrun", ["swiftc", "-swift-version", "5", "-o", executable,
    path.join(__dirname, "../modules/vidkar-mcp/ios/MCPQueryPolicy.swift"),
    path.join(__dirname, "MCPQueryPolicyTests.swift")], { encoding: "utf8" });
  assert.equal(build.status, 0, build.stderr);
  const result = spawnSync(executable, [], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  t.diagnostic(result.stdout.trim());
});

test("búsqueda Swift estable conserva criterios sin inferencia", { skip: process.platform !== "darwin" }, (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-search-policy-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const executable = path.join(directory, "search-tests");
  const build = spawnSync("xcrun", ["swiftc", "-swift-version", "5", "-o", executable,
    path.join(__dirname, "../modules/vidkar-mcp/ios/MCPInAppSearch.swift"),
    path.join(__dirname, "MCPInAppSearchTests.swift")], { encoding: "utf8" });
  assert.equal(build.status, 0, build.stderr);
  const result = spawnSync(executable, [], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  t.diagnostic(result.stdout.trim());
});

test("transporte Swift real rechaza rotación same-owner antes y durante ejecución", { skip: process.platform !== "darwin" }, (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-transport-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const original = fs.readFileSync(path.join(__dirname, "../modules/vidkar-mcp/ios/VidkarMCPModule.swift"), "utf8");
  const end = original.indexOf("#if VIDKAR_LEGACY_INTENTS\nenum VIDKAREntityType");
  const keychainStart = original.indexOf("private final class KeychainStore");
  const transportStart = original.indexOf("private actor MCPTransport");
  assert.ok(end > transportStart && transportStart > keychainStart);
  // Se ejecuta el actor de producción. Solo se sustituyen I/O de Keychain,
  // preferencias y HTTP: jamás se toca Keychain ni se permite red real.
  const source = (original.slice(0, keychainStart) + original.slice(transportStart, end))
    .replace("import AppIntents\n", "").replace("import ExpoModulesCore\n", "").replace("import Security\n", "")
    .replaceAll("UserDefaults.standard", "transportTestDefaults")
    .replace("URLSession.shared.data(for: request)", "FixtureNetwork.shared.data(for: request)");
  assert.ok(!source.includes("URLSession.shared") && !source.includes("SecItem"));
  const sourcePath = path.join(directory, "Transport.swift");
  fs.writeFileSync(sourcePath, source + fs.readFileSync(path.join(__dirname, "MCPTransportSessionTests.swift"), "utf8"));
  const executable = path.join(directory, "transport-tests");
  const build = spawnSync("xcrun", ["swiftc", "-swift-version", "5", "-parse-as-library", "-o", executable,
    path.join(__dirname, "../modules/vidkar-mcp/ios/MCPQueryPolicy.swift"),
    path.join(__dirname, "../modules/vidkar-mcp/ios/MCPCatalogQuery.swift"), sourcePath], { encoding: "utf8" });
  assert.equal(build.status, 0, build.stderr);
  const result = spawnSync(executable, [], { encoding: "utf8", timeout: 20000 });
  assert.equal(result.status, 0, result.error?.message || result.stderr);
  t.diagnostic(result.stdout.trim());
});

test("consulta de catálogo: perform y entidades reales con I/O aislado", { skip: process.platform !== "darwin" }, (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-catalog-intent-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const original = fs.readFileSync(path.join(__dirname, "../modules/vidkar-mcp/ios/VidkarMCPModule.swift"), "utf8");
  const keychainStart = original.indexOf("private final class KeychainStore");
  const transportStart = original.indexOf("private actor MCPTransport");
  const legacyStart = original.indexOf("#if VIDKAR_LEGACY_INTENTS\nenum VIDKAREntityType");
  const catalogStart = original.indexOf("protocol VIDKARCatalogAppEntity:");
  const bridgeStart = original.indexOf("public final class VidkarMCPModule: Module");
  assert.ok(keychainStart > 0 && transportStart > keychainStart && legacyStart > transportStart && catalogStart > legacyStart && bridgeStart > catalogStart);
  const source = (original.slice(0, keychainStart) + original.slice(transportStart, legacyStart) + original.slice(catalogStart, bridgeStart))
    .replace("import ExpoModulesCore\n", "").replace("import Security\n", "")
    .replaceAll("UserDefaults.standard", "transportTestDefaults")
    .replace("URLSession.shared.data(for: request)", "FixtureNetwork.shared.data(for: request)");
  assert.ok(!source.includes("URLSession.shared") && !source.includes("SecItem") && !source.includes("OpenURLIntent"));
  const fixtures = fs.readFileSync(path.join(__dirname, "MCPTransportSessionTests.swift"), "utf8").split("@main")[0];
  const file = path.join(directory, "Catalog.swift");
  fs.writeFileSync(file, source + fixtures + fs.readFileSync(path.join(__dirname, "MCPCatalogIntentTests.swift"), "utf8"));
  const executable = path.join(directory, "catalog-tests");
  const build = spawnSync("xcrun", ["swiftc", "-swift-version", "5", "-parse-as-library", "-o", executable,
    path.join(__dirname, "../modules/vidkar-mcp/ios/MCPQueryPolicy.swift"),
    path.join(__dirname, "../modules/vidkar-mcp/ios/MCPCatalogQuery.swift"), file], { encoding: "utf8" });
  assert.equal(build.status, 0, build.stderr);
  const result = spawnSync(executable, [], { encoding: "utf8", timeout: 20000 });
  assert.equal(result.status, 0, result.error?.message || result.stderr);
  t.diagnostic(result.stdout.trim());
});