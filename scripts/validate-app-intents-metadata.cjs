const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const shortcutIntents = [
  "VIDKARQueryMCPIntent",
  "VIDKARExecuteMCPIntent",
  "VIDKARSearchMoviesIntent",
  "VIDKARSearchSeriesIntent",
  "VIDKARSearchCoursesIntent",
  "VIDKARSearchCommerceProductsIntent",
  "VIDKARGetServiceUsageIntent",
  "VIDKARQueryCatalogIntent",
];
// El schema se descubre por su metadata nativa; no necesita otro App Shortcut.
const expectedIntents = [...shortcutIntents, "VIDKARSearchInAppIntent"];

function validateMetadata(metadata) {
  const actions = metadata?.actions;
  const shortcuts = metadata?.autoShortcuts;
  if (!actions || Array.isArray(actions) || !Array.isArray(shortcuts)) {
    throw new Error("Formato App Intents inesperado: se requieren actions y autoShortcuts.");
  }
  for (const identifier of expectedIntents) {
    // Una referencia en autoShortcuts NO demuestra que la acción esté empaquetada.
    if (!Object.hasOwn(actions, identifier)) throw new Error(`Falta la acción ${identifier}.`);
    const action = actions[identifier];
    if (action?.isDiscoverable !== true || action.visibilityMetadata?.isDiscoverable === false) {
      throw new Error(`La acción ${identifier} no es descubrible.`);
    }
    if (shortcutIntents.includes(identifier) && !shortcuts.some((shortcut) => shortcut.actionIdentifier === identifier && shortcut.phraseTemplates?.length > 0)) {
      throw new Error(`Falta el App Shortcut con frases de ${identifier}.`);
    }
  }
  for (const identifier of ["VIDKARAskQuestionIntent"]) {
    if (Object.hasOwn(actions, identifier) || shortcuts.some((shortcut) => shortcut.actionIdentifier === identifier)) {
      throw new Error(`Intent experimental habilitado: ${identifier}.`);
    }
  }
  const query = actions.VIDKARQueryCatalogIntent;
  if (query.openAppWhenRun !== false || query.authenticationPolicy !== 1 || query.assistantDefinedSchemas?.length) {
    throw new Error("QueryCatalog requiere background autenticado sin schema Apple de apertura.");
  }
  const parameter = query.parameters?.[0];
  if (query.parameters?.length !== 1 || parameter.name !== "query" || parameter.isOptional !== false ||
      parameter.valueType?.primitive?.wrapper?.typeIdentifier !== 0 ||
      parameter.typeSpecificMetadata?.includes("LNValueTypeSpecificMetadataKeyDefaultValue")) {
    throw new Error("QueryCatalog requiere query String sin default vacío.");
  }
  if (query.outputType?.array?.wrapper?.memberValueType?.entity?.wrapper?.typeName !== "VIDKARCatalogResultEntity") {
    throw new Error("QueryCatalog debe devolver entidades de catálogo tipadas.");
  }
  const entity = metadata.entities?.VIDKARCatalogResultEntity;
  if (entity?.transient !== true || JSON.stringify(entity.properties?.map((property) => property.identifier).sort()) !==
      JSON.stringify(["description", "sourceId", "subtitle", "title", "type"])) {
    throw new Error("QueryCatalog requiere entidad transitoria con proyección mínima.");
  }
  const search = actions.VIDKARSearchInAppIntent;
  if (!search.assistantDefinedSchemas?.some((schema) => schema.domain === "system" && schema.name === "SystemSearchInAppIntent")) {
    throw new Error("Falta el schema system.searchInApp estable.");
  }
  if (search.availabilityAnnotations?.LNPlatformNameIOS?.introducedVersion !== "27.0" ||
      search.openAppWhenRun !== true || search.authenticationPolicy !== 2) {
    throw new Error("searchInApp requiere iOS 27, foreground y autenticación local del dispositivo.");
  }
  if (search.parameters?.length !== 1 || search.parameters[0].name !== "criteria" ||
      !search.parameters[0].valueType?.searchCriteria) {
    throw new Error("searchInApp debe recibir únicamente los criterios del sistema.");
  }
  const scopes = search.systemProtocolMetadataV2?.find((entry) => entry?.showInAppStringSearchResults)?.showInAppStringSearchResults.searchScopes;
  if (!Array.isArray(scopes) || JSON.stringify([...scopes].sort()) !== JSON.stringify(["general", "movies", "tv"])) {
    throw new Error("Scopes de búsqueda inesperados: solo general, movies y tv.");
  }
  return { actions: Object.keys(actions).length, shortcuts: shortcuts.length, verifiedIntents: expectedIntents };
}

function validateAppBundle(appPath) {
  if (!appPath || path.extname(appPath) !== ".app") throw new Error("Indica la ruta del .app principal, no el pod ni una extensión.");
  // Xcode 27: comprobar el bundle principal exacto, nunca aceptar metadata solo en Pods/PlugIns.
  const file = path.join(appPath, "Metadata.appintents", "extract.actionsdata");
  if (!fs.existsSync(file)) throw new Error(`Faltan metadatos en el bundle principal: ${file}`);
  const metadata = JSON.parse(fs.readFileSync(file, "utf8"));
  return { ...validateMetadata(metadata), spanish: validateSpanishResources(appPath, metadata) };
}

function readStrings(file) {
  if (!fs.existsSync(file)) throw new Error(`Falta recurso compilado: ${file}`);
  // plutil acepta tanto .strings de texto como plist binario. JSON solo facilita
  // fixtures portables; el test iOS usa xcstringstool y plist binario reales.
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { /* plist */ }
  const parsed = spawnSync("plutil", ["-convert", "json", "-o", "-", file], { encoding: "utf8" });
  if (parsed.status !== 0) throw new Error(`No se pudo leer ${file}; requiere plutil (macOS).`);
  return JSON.parse(parsed.stdout);
}

function validateSpanishResources(appPath, metadata) {
  // Las frases fuente en actionsdata o CFBundleLocalizations por sí solos NO
  // prueban localización. xcstrings se compila: no exigir el archivo fuente en IPA.
  const locales = fs.readdirSync(appPath).filter((name) => /^es(?:[-_][A-Za-z0-9]+)*\.lproj$/.test(name));
  if (!locales.length) throw new Error("Falta evidencia española compilada en el bundle principal (es.lproj).");
  const placeholders = (text) => (text.match(/\$\{[^}]+\}/g) || []).sort();
  const keys = metadata.autoShortcuts.flatMap((shortcut) => shortcut.phraseTemplates.map((phrase) => phrase.key));
  const errors = [];
  for (const locale of locales) {
    try {
      const phrases = readStrings(path.join(appPath, locale, "AppShortcuts.strings"));
      for (const key of keys) {
        const value = phrases[key];
        if (typeof value !== "string" || !value.trim()) throw new Error(`Falta traducción española de la frase: ${key}`);
        if (JSON.stringify(placeholders(value)) !== JSON.stringify(placeholders(key))) throw new Error(`Placeholders españoles inválidos: ${key}`);
      }
      const actions = readStrings(path.join(appPath, locale, "Localizable.strings"));
      for (const key of ["Consulta MCP", "Ejecuta MCP", "Consulta mi Proxy o VPN", "Servicio", "Herramienta MCP",
        "Consulta el catálogo", "Qué quieres consultar", "Coincidencia del catálogo",
        "No encontré coincidencias en el catálogo autorizado de VIDKAR.",
        "No se pudo conectar con VIDKAR. Comprueba la conexión e inténtalo de nuevo.",
        "¿Quieres consultar el estado y consumo de tu servicio en VIDKAR?",
        "Esta consulta accede a información privada de tu cuenta. ¿Quieres continuar?"]) {
        if (typeof actions[key] !== "string" || !actions[key].trim()) throw new Error(`Falta texto español de acción: ${key}`);
      }
      const nluPath = path.join(appPath, locale, "nlu.appintents");
      const hasNLU = fs.existsSync(nluPath) && fs.statSync(nluPath).isDirectory() && fs.readdirSync(nluPath).length > 0;
      // NLU depende de la versión/configuración de Xcode. Informar su presencia
      // sin exigir este formato privado a todos los archivos exportados.
      return { locale: locale.replace(/\.lproj$/, ""), phrases: keys.length, compiledResources: ["AppShortcuts.strings", "Localizable.strings"], nlu: hasNLU };
    } catch (error) { errors.push(error.message); }
  }
  throw new Error(errors.join("; "));
}

if (require.main === module) {
  try {
    console.log(JSON.stringify(validateAppBundle(process.argv[2]), null, 2));
  } catch (error) {
    console.error(`App Intents: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { expectedIntents, shortcutIntents, validateMetadata, validateAppBundle, validateSpanishResources };