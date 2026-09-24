import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const moduleSource = await fs.readFile(new URL("modules/vidkar-mcp/ios/VidkarMCPModule.swift", root), "utf8");
const spotlightSource = await fs.readFile(new URL("modules/vidkar-mcp/ios/VidkarSpotlightIndex.swift", root), "utf8");
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

const assistantOnlyIntentNames = ["VIDKARAssistantOpenEntityIntent"];
const allIntentNames = [...publicIntentNames, ...assistantOnlyIntentNames];
const intentBlocks = new Map(allIntentNames.map((name) => [name, intentBlock(name)]));

test("solo existen cuatro intents públicos con títulos únicos", () => {
  const declared = [...moduleSource.matchAll(/^struct (VIDKAR\w+Intent): (?:AppIntent|OpenIntent)/gm)]
    .map((match) => match[1]);
  const publicDeclared = declared.filter((name) => !intentBlock(name).includes("isAssistantOnly = true"));
  const assistantOnlyDeclared = declared.filter((name) => intentBlock(name).includes("isAssistantOnly = true"));
  assert.deepEqual(publicDeclared.sort(), [...publicIntentNames].sort());
  assert.deepEqual(assistantOnlyDeclared, assistantOnlyIntentNames);

  const titles = allIntentNames.map((name) => {
    const title = intentBlocks.get(name).match(/static var title: LocalizedStringResource = "([^"]+)"/)?.[1];
    assert.ok(title, `${name} necesita un título`);
    return title;
  });
  assert.equal(new Set(titles).size, titles.length);
});

test("solo hay cuatro AppShortcuts para los intents principales", () => {
  const shortcutBlock = moduleSource.match(/struct VIDKARAppShortcuts: AppShortcutsProvider \{([\s\S]*?)\n\}/)?.[1] || "";
  const shortcutIntents = [...shortcutBlock.matchAll(/AppShortcut\(intent: (\w+)/g)].map((match) => match[1]);
  assert.deepEqual(shortcutIntents, publicIntentNames);
});

test("search y account devuelven entidades y diálogo sin navegación ni JSON arbitrario", () => {
  for (const name of ["VIDKARSearchContentIntent", "VIDKARAccountQueryIntent"]) {
    const block = intentBlocks.get(name);
    assert.match(block, /ReturnsValue<\[VIDKARSearchResultEntity\]>/);
    assert.match(block, /ProvidesDialog/);
    assert.match(block, /\.result\(\s*value:/);
    assert.doesNotMatch(block, /argumentsJSON|vidkarDeepLink|openVIDKARURL|UIApplication\.shared\.open|Linking\.openURL|router\.(?:push|replace)/);
  }
  assert.match(intentBlocks.get("VIDKARAccountQueryIntent"), /requiresAuthentication/);
  assert.match(intentBlocks.get("VIDKARAccountQueryIntent"), /forceConfirmation: true/);
  assert.match(intentBlocks.get("VIDKARAccountQueryIntent"), /var dataType: VIDKARAccountDataType/);
  assert.match(intentBlocks.get("VIDKARAccountQueryIntent"), /var period: VIDKARPeriod/);
  assert.match(intentBlocks.get("VIDKARSearchContentIntent"), /var entityType: VIDKAREntityType/);
  assert.match(intentBlocks.get("VIDKARSearchContentIntent"), /var sort: VIDKARSearchSort/);
  assert.match(intentBlocks.get("VIDKARSearchContentIntent"), /confirmedVIDKARSearch\(arguments\)/);
});

test("el intent de cuenta solo ofrece los seis tipos permitidos y lesson usa confirmación", () => {
  const accountType = moduleSource.match(/enum VIDKARAccountDataType: String, AppEnum \{([\s\S]*?)\n\}/)?.[1] || "";
  const accountCases = [...accountType.matchAll(/^  case (\w+)$/gm)].map((match) => match[1]);
  assert.deepEqual(accountCases, ["purchase", "sale", "order", "message", "subscription", "user"]);

  const contentType = moduleSource.match(/enum VIDKAREntityType: String, AppEnum \{([\s\S]*?)\n\}/)?.[1] || "";
  const contentCases = [...contentType.matchAll(/^  case (\w+)$/gm)].map((match) => match[1]);
  assert.deepEqual(contentCases, ["all", "movie", "series", "episode", "course", "lesson", "product"]);
  const privateEntities = moduleSource.match(/let privateEntities: Set<String> = \[([^\]]+)\]/)?.[1] || "";
  for (const type of ["user", "purchase", "sale", "order", "message", "subscription", "lesson"]) {
    assert.ok(privateEntities.includes(`"${type}"`), `${type} requiere confirmación MCP`);
  }
});

test("solo los intents de abrir/reproducir pueden llamar la navegación nativa", () => {
  for (const name of ["VIDKAROpenEntityIntent", "VIDKARAssistantOpenEntityIntent", "VIDKARPlayContentIntent"]) {
    assert.match(intentBlocks.get(name), /openVIDKARURL\(url\)/);
  }
  assert.equal((moduleSource.match(/openVIDKARURL\(/g) || []).length, 4); // tres intents y definición
  assert.match(intentBlocks.get("VIDKAROpenEntityIntent"), /: OpenIntent/);
  assert.match(intentBlocks.get("VIDKARPlayContentIntent"), /requestConfirmation\(\)/);
  assert.match(intentBlocks.get("VIDKARPlayContentIntent"), /validatePlayableEntity/);
  assert.match(intentBlocks.get("VIDKARPlayContentIntent"), /authorizePlayback/);
});

test("no hay schema searchInApp ni deeplink de búsqueda o ruta SiriSearch", async () => {
  assert.doesNotMatch(moduleSource, /VIDKARSiriSearchIntent|system\.searchInApp|vidkarDeepLink\(type: \.all/);
  assert.match(moduleSource, /@AppIntent\(schema: \.system\.open\)\s+struct VIDKARAssistantOpenEntityIntent/);
  assert.match(intentBlocks.get("VIDKARAssistantOpenEntityIntent"), /isAssistantOnly = true/);
  assert.doesNotMatch(intentBlocks.get("VIDKARSearchContentIntent"), /AppIntent\(schema:/);
  assert.doesNotMatch(intentBlocks.get("VIDKARAccountQueryIntent"), /AppIntent\(schema:/);
  assert.doesNotMatch(linksSource, /SiriSearch|section === "search"/);
  assert.equal(await fs.stat(new URL("app/(normal)/SiriSearch.tsx", root)).then(() => true, () => false), false);
});

test("EntityQuery representa resultados públicos y Spotlight excluye datos privados", () => {
  assert.match(moduleSource, /struct VIDKARSearchResultEntity: AppEntity/);
  assert.match(moduleSource, /struct VIDKARSearchResultEntityQuery: EntityStringQuery/);
  assert.match(moduleSource, /id: "\\\(payload\.type\):\\\(payload\.id\)"/);
  assert.match(spotlightSource, /publicTypes: Set<String> = \[\s*"movie",\s*"series",\s*"episode",\s*"course",\s*"product"/);
  assert.doesNotMatch(spotlightSource, /"user"|"purchase"|"sale"|"order"|"message"|"subscription"|"lesson"/);
});
