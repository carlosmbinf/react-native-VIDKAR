/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { expectedIntents, shortcutIntents, validateMetadata, validateAppBundle } = require("../scripts/validate-app-intents-metadata.cjs");

const fixture = () => ({
  actions: {
    ...Object.fromEntries(expectedIntents.map((id) => [id, { isDiscoverable: true }])),
    VIDKARQueryCatalogIntent: {
      isDiscoverable: true, openAppWhenRun: false, authenticationPolicy: 1, assistantDefinedSchemas: [],
      parameters: [{ name: "query", isOptional: false, valueType: { primitive: { wrapper: { typeIdentifier: 0 } } }, typeSpecificMetadata: [] }],
      outputType: { array: { wrapper: { memberValueType: { entity: { wrapper: { typeName: "VIDKARCatalogResultEntity" } } } } } },
    },
    VIDKARSearchInAppIntent: {
      isDiscoverable: true,
      assistantDefinedSchemas: [{ domain: "system", name: "SystemSearchInAppIntent" }],
      availabilityAnnotations: { LNPlatformNameIOS: { introducedVersion: "27.0" } },
      openAppWhenRun: true,
      authenticationPolicy: 2,
      parameters: [{ name: "criteria", valueType: { searchCriteria: {} } }],
      systemProtocolMetadataV2: [{ showInAppStringSearchResults: { searchScopes: ["general", "movies", "tv"] } }],
    },
  },
  entities: { VIDKARCatalogResultEntity: { transient: true, properties: ["type", "sourceId", "title", "subtitle", "description"].map((identifier) => ({ identifier })) } },
  autoShortcuts: shortcutIntents.map((actionIdentifier) => ({ actionIdentifier, phraseTemplates: [{ key: "Consulta en ${applicationName}" }] })),
});

const writeSpanishResources = (app, locale = "es") => {
  const directory = path.join(app, `${locale}.lproj`);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "AppShortcuts.strings"), JSON.stringify({ "Consulta en ${applicationName}": "Consulta en ${applicationName}" }));
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../plugins/resources/vidkar-app-intents/Localizable.xcstrings"), "utf8"));
  fs.writeFileSync(path.join(directory, "Localizable.strings"), JSON.stringify(Object.fromEntries(
    Object.entries(catalog.strings).map(([key, entry]) => [key, entry.localizations.es.stringUnit.value])
  )));
};

test("acepta nueve acciones descubribles y ocho shortcuts conservando los siete anteriores", () => {
  assert.equal(validateMetadata(fixture()).actions, 9);
});

test("rechaza referencias a shortcuts sin acciones y cada acción ausente", () => {
  assert.throws(() => validateMetadata({ ...fixture(), actions: {} }), /Falta la acción/);
  for (const id of expectedIntents) {
    const metadata = fixture();
    delete metadata.actions[id];
    assert.throws(() => validateMetadata(metadata), new RegExp(id));
  }
});

test("rechaza acciones ocultas, shortcuts ausentes y experimentales", () => {
  const hidden = fixture();
  hidden.actions[expectedIntents[0]].isDiscoverable = false;
  assert.throws(() => validateMetadata(hidden), /no es descubrible/);
  assert.throws(() => validateMetadata({ ...fixture(), autoShortcuts: [] }), /Falta el App Shortcut/);
  for (const id of ["VIDKARAskQuestionIntent"]) {
    const metadata = fixture();
    metadata.actions[id] = { isDiscoverable: true };
    assert.throws(() => validateMetadata(metadata), /experimental/);
  }
  assert.throws(() => validateMetadata({}), /Formato/);
});

test("exige metadata del bundle principal, no solo la de un framework", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-artifact-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const app = path.join(directory, "Vidkar.app");
  const nested = path.join(app, "Frameworks/VidkarMCP.framework/Metadata.appintents");
  fs.mkdirSync(nested, { recursive: true });
  fs.writeFileSync(path.join(nested, "extract.actionsdata"), JSON.stringify(fixture()));
  assert.throws(() => validateAppBundle(app), /Faltan metadatos/);
  const root = path.join(app, "Metadata.appintents");
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, "extract.actionsdata"), JSON.stringify(fixture()));
  assert.throws(() => validateAppBundle(app), /evidencia española/);
  writeSpanishResources(app);
  assert.equal(validateAppBundle(app).shortcuts, 8);
  fs.writeFileSync(path.join(root, "extract.actionsdata"), "not JSON");
  assert.throws(() => validateAppBundle(app), SyntaxError);
});

test("exige español real, claves y placeholders sin exigir xcstrings ni CFBundleLocalizations", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-spanish-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const app = path.join(directory, "Vidkar.app");
  fs.mkdirSync(path.join(app, "Metadata.appintents"), { recursive: true });
  fs.writeFileSync(path.join(app, "Metadata.appintents/extract.actionsdata"), JSON.stringify(fixture()));
  fs.writeFileSync(path.join(app, "Info.plist"), JSON.stringify({ CFBundleLocalizations: ["es"] }));
  writeSpanishResources(path.join(app, "Frameworks/Other.framework"));
  assert.throws(() => validateAppBundle(app), /evidencia española/);
  writeSpanishResources(app, "es-MX");
  assert.equal(validateAppBundle(app).spanish.locale, "es-MX");
  const phrases = path.join(app, "es-MX.lproj/AppShortcuts.strings");
  fs.writeFileSync(phrases, "{}");
  assert.throws(() => validateAppBundle(app), /Falta traducción/);
  fs.writeFileSync(phrases, JSON.stringify({ "Consulta en ${applicationName}": "Consulta en VIDKAR" }));
  assert.throws(() => validateAppBundle(app), /Placeholders/);
  writeSpanishResources(app, "es-MX");
  fs.unlinkSync(path.join(app, "es-MX.lproj/Localizable.strings"));
  assert.throws(() => validateAppBundle(app), /Falta recurso compilado/);
});

test("rechaza schema sin contrato, scopes inventados o políticas menos restrictivas", () => {
  for (const mutate of [
    (search) => { search.assistantDefinedSchemas = []; },
    (search) => { search.authenticationPolicy = 1; },
    (search) => { search.openAppWhenRun = false; },
    (search) => { search.availabilityAnnotations.LNPlatformNameIOS.introducedVersion = "17.2"; },
    (search) => { search.parameters[0].name = "question"; },
    (search) => { search.systemProtocolMetadataV2[0].showInAppStringSearchResults.searchScopes.push("courses"); },
  ]) {
    const metadata = fixture();
    mutate(metadata.actions.VIDKARSearchInAppIntent);
    assert.throws(() => validateMetadata(metadata), /schema|searchInApp|Scopes/);
  }
  const metadata = fixture();
  metadata.autoShortcuts.push({ actionIdentifier: "VIDKARAskQuestionIntent" });
  assert.throws(() => validateMetadata(metadata), /experimental/);
});

test("rechaza consulta informativa foreground, opcional, con default, salida falsa o datos adicionales", () => {
  for (const mutate of [
    (m) => { m.actions.VIDKARQueryCatalogIntent.openAppWhenRun = true; },
    (m) => { m.actions.VIDKARQueryCatalogIntent.assistantDefinedSchemas = [{}]; },
    (m) => { m.actions.VIDKARQueryCatalogIntent.parameters[0].isOptional = true; },
    (m) => { m.actions.VIDKARQueryCatalogIntent.parameters[0].typeSpecificMetadata = ["LNValueTypeSpecificMetadataKeyDefaultValue", { string: { wrapper: "" } }]; },
    (m) => { delete m.actions.VIDKARQueryCatalogIntent.outputType; },
    (m) => { m.entities.VIDKARCatalogResultEntity.transient = false; },
    (m) => { m.entities.VIDKARCatalogResultEntity.properties.push({ identifier: "token" }); },
  ]) {
    const metadata = fixture(); mutate(metadata);
    assert.throws(() => validateMetadata(metadata), /QueryCatalog/);
  }
});