import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const moduleSource = await fs.readFile(new URL("modules/vidkar-mcp/ios/VidkarMCPModule.swift", root), "utf8");
const linksSource = await fs.readFile(new URL("services/navigation/universalLinks.ts", root), "utf8");

const publicIntentNames = [
  "VIDKARSearchContentIntent",
  "VIDKARAccountQueryIntent",
  "VIDKAROpenEntityIntent",
  "VIDKARPlayContentIntent",
];

function intentBlock(name) {
  const start = moduleSource.indexOf(`struct ${name}:`);
  assert.notEqual(start, -1, `No se encontró ${name}`);
  const boundaries = [
    moduleSource.indexOf("\n@available", start + 1),
    moduleSource.indexOf("\n@MainActor", start + 1),
    moduleSource.indexOf("\nprivate func", start + 1),
    moduleSource.indexOf("\npublic struct", start + 1),
  ].filter((index) => index >= 0);
  return moduleSource.slice(start, boundaries.length ? Math.min(...boundaries) : undefined);
}

const intentBlocks = new Map(publicIntentNames.map((name) => [name, intentBlock(name)]));

test("solo existen cuatro intents públicos con títulos únicos", () => {
  const declared = [...moduleSource.matchAll(/^struct (VIDKAR\w+Intent): (?:AppIntent|OpenIntent)/gm)]
    .map((match) => match[1]);
  assert.deepEqual(declared.sort(), [...publicIntentNames].sort());

  const titles = publicIntentNames.map((name) => {
    const title = intentBlocks.get(name).match(/static var title: LocalizedStringResource = "([^"]+)"/)?.[1];
    assert.ok(title, `${name} necesita un título`);
    return title;
  });
  assert.equal(new Set(titles).size, titles.length);
});

test("solo hay cuatro AppShortcuts para los intents principales", () => {
  const shortcutBlock = moduleSource.match(/struct VIDKARAppShortcuts: AppShortcutsProvider \{([\s\S]*?)\n  \}/)?.[1] || "";
  const shortcutIntents = [...shortcutBlock.matchAll(/AppShortcut\(intent: (\w+)/g)].map((match) => match[1]);
  assert.deepEqual(shortcutIntents, publicIntentNames);
});

test("las consultas devuelven entidades/dialog y no navegan", () => {
  for (const name of ["VIDKARSearchContentIntent", "VIDKARAccountQueryIntent"]) {
    const block = intentBlocks.get(name);
    assert.match(block, /ReturnsValue<\[VIDKARSearchResultEntity\]>/);
    assert.match(block, /ProvidesDialog/);
    assert.match(block, /\.result\(value:/);
    assert.match(block, /IntentDialog/);
    assert.match(moduleSource, new RegExp(`extension ${name} \\{[\\s\\S]*supportedModes: IntentModes \\{ \\.background \\}`));
    assert.doesNotMatch(block, /argumentsJSON|vidkarDeepLink|openVIDKARURL|UIApplication\.shared\.open|Linking\.openURL|router\.(?:push|replace)/);
  }
});

test("la consulta de cuenta usa tipos permitidos y confirmación", () => {
  const accountType = moduleSource.match(/enum VIDKARAccountDataType: String, AppEnum \{([\s\S]*?)\n\}/)?.[1] || "";
  const accountCases = [...accountType.matchAll(/^  case (\w+)$/gm)].map((match) => match[1]);
  assert.deepEqual(accountCases, ["purchase", "sale", "order", "message", "subscription", "user"]);
  assert.match(intentBlocks.get("VIDKARAccountQueryIntent"), /requiresAuthentication/);
  assert.match(intentBlocks.get("VIDKARAccountQueryIntent"), /forceConfirmation: true/);
});

test("solo abrir y reproducir pueden usar deeplinks", () => {
  assert.match(intentBlocks.get("VIDKAROpenEntityIntent"), /openVIDKARURL\(url\)/);
  assert.match(intentBlocks.get("VIDKARPlayContentIntent"), /openVIDKARURL\(url\)/);
  assert.doesNotMatch(intentBlocks.get("VIDKARSearchContentIntent"), /openVIDKARURL|vidkarDeepLink|UIApplication\.shared\.open/);
  assert.doesNotMatch(intentBlocks.get("VIDKARAccountQueryIntent"), /openVIDKARURL|vidkarDeepLink|UIApplication\.shared\.open/);
  assert.doesNotMatch(linksSource, /SiriSearch|section === "search"|vidkar:\/\/search/);
});

test("no existe searchInApp activo", () => {
  assert.doesNotMatch(moduleSource, /VIDKARSiriSearchIntent|system\.searchInApp/);
});
