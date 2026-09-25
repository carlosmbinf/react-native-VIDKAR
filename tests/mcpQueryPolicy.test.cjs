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