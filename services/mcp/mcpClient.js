import * as SecureStore from "expo-secure-store";
import { VidkarMCP } from "../../modules/vidkar-mcp/src";
import { getMCPUrl } from "../appUrls";
import { Meteor } from "../meteor/client.native";
import { formatToolCatalog, parseArgumentsJSON } from "./mcpProtocol";

const TOKEN_KEY = "vidkar.mcp.bearer.v1";
const TOKEN_ID_KEY = "vidkar.mcp.tokenId.v1";
const PENDING_TOKEN_KEY = "vidkar.mcp.pendingBearer.v1";
const URL_KEY = "vidkar.mcp.url.v1";
const TOOL_CACHE_KEY = "vidkar.mcp.tools.v2";
const TOOL_CACHE_TTL_MS = 5 * 60 * 1000;
const requireNativeMCP = () => {
  if (!VidkarMCP) throw new Error("El módulo nativo MCP no está disponible en este binario.");
  return VidkarMCP;
};

const isHttpsUrl = (value) => /^https:\/\//i.test(String(value || "").trim());

const getConfiguredMCPUrl = () => getMCPUrl();

const readCache = async () => {
  const raw = await SecureStore.getItemAsync(TOOL_CACHE_KEY);
  if (!raw) return null;
  try {
    const cache = JSON.parse(raw);
    return Array.isArray(cache?.tools) && typeof cache?.updatedAt === "number" ? cache : null;
  } catch {
    return null;
  }
};

const callMeteorMethod = (methodName, ...args) => new Promise((resolve, reject) => {
  Meteor.call(methodName, ...args, (error, result) => (error ? reject(error) : resolve(result)));
});

export const configureMCP = async ({ url, token, tokenId }) => {
  if (!VidkarMCP) throw new Error("La integración MCP de VIDKAR requiere un binario iOS nativo.");
  const ownerId = Meteor.userId();
  if (!ownerId) throw new Error("Inicia sesión en VIDKAR antes de configurar MCP.");
  const configuredUrl = isHttpsUrl(url) ? url : getConfiguredMCPUrl();
  if (!configuredUrl) throw new Error("El endpoint MCP no está configurado.");
  if (String(token || "").length < 20) throw new Error("El token MCP no es válido.");
  const normalizedUrl = String(configuredUrl).trim().replace(/\/$/, "");
  try {
    await requireNativeMCP().configure(normalizedUrl, String(token), String(ownerId));
  } catch (error) {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => null),
      SecureStore.deleteItemAsync(TOKEN_ID_KEY).catch(() => null),
      SecureStore.deleteItemAsync(URL_KEY).catch(() => null),
      SecureStore.deleteItemAsync(TOOL_CACHE_KEY).catch(() => null),
    ]);
    throw error;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, String(token));
  if (typeof tokenId === "string" && tokenId) await SecureStore.setItemAsync(TOKEN_ID_KEY, tokenId);
  else await SecureStore.deleteItemAsync(TOKEN_ID_KEY);
  await SecureStore.setItemAsync(URL_KEY, normalizedUrl);
  await SecureStore.deleteItemAsync(TOOL_CACHE_KEY);
  await SecureStore.deleteItemAsync(PENDING_TOKEN_KEY);
};

export const createAndConfigureMCPToken = async (label = "VIDKAR iOS") => {
  if (!VidkarMCP) throw new Error("La integración MCP de VIDKAR requiere un binario iOS nativo.");
  const result = await callMeteorMethod("mcp.tokens.create", label);
  const mcpUrl = getConfiguredMCPUrl() || (isHttpsUrl(result?.mcpUrl) ? result.mcpUrl : null);
  if (!result?.token || !mcpUrl) {
    if (result?.tokenId) await revokeMCPToken(result.tokenId);
    throw new Error("El backend no devolvió un endpoint HTTPS y token MCP válidos.");
  }
  try {
    await SecureStore.setItemAsync(PENDING_TOKEN_KEY, result.token);
    await configureMCP({ url: mcpUrl, token: result.token, tokenId: result.tokenId });
  } catch (error) {
    if (result?.tokenId) await revokeMCPToken(result.tokenId).catch(() => null);
    await clearMCPConfiguration().catch(() => null);
    throw error;
  }
  return result;
};

export const rotateAndConfigureMCPToken = async (tokenId, label = "VIDKAR iOS") => {
  if (!VidkarMCP) throw new Error("La integración MCP de VIDKAR requiere un binario iOS nativo.");
  const result = await callMeteorMethod("mcp.tokens.rotate", tokenId, label);
  const mcpUrl = getConfiguredMCPUrl() || (isHttpsUrl(result?.mcpUrl) ? result.mcpUrl : null);
  if (!result?.token || !result?.tokenId || !mcpUrl) {
    if (result?.tokenId) await revokeMCPToken(result.tokenId).catch(() => null);
    throw new Error("El backend no devolvió un endpoint HTTPS y token MCP válidos.");
  }
  try {
    await SecureStore.setItemAsync(PENDING_TOKEN_KEY, result.token);
    await configureMCP({ url: mcpUrl, token: result.token, tokenId: result.tokenId });
  } catch (error) {
    await requireNativeMCP().clearConfiguration().catch(() => null);
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => null),
      SecureStore.deleteItemAsync(URL_KEY).catch(() => null),
      SecureStore.deleteItemAsync(TOOL_CACHE_KEY).catch(() => null),
      SecureStore.setItemAsync(TOKEN_ID_KEY, result.tokenId).catch(() => null),
    ]);
    throw error;
  }
  return result;
};

export const getMCPAccessStatus = async () => {
  const ownerId = Meteor.userId();
  if (!ownerId) throw new Error("Inicia sesión en VIDKAR para consultar el acceso MCP.");
  const nativeModule = requireNativeMCP();
  let configuration;
  const [initialConfiguration, tokenIdValue, storedBearer, pendingBearer, serverResult] = await Promise.all([
    nativeModule.getConfiguration(),
    SecureStore.getItemAsync(TOKEN_ID_KEY),
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(PENDING_TOKEN_KEY),
    callMeteorMethod("mcp.tokens.list"),
  ]);
  configuration = initialConfiguration;
  const savedBearer = pendingBearer || storedBearer;
  const tokens = Array.isArray(serverResult?.tokens) ? serverResult.tokens : [];
  let tokenId = tokenIdValue;
  if (!tokenId && savedBearer) {
    const prefix = `${String(savedBearer).slice(0, 18)}…`;
    const legacyToken = tokens.find((item) => item?.tokenPreview === prefix && !item?.revokedAt);
    if (legacyToken?.tokenId) {
      tokenId = legacyToken.tokenId;
      await SecureStore.setItemAsync(TOKEN_ID_KEY, tokenId);
    }
  }
  const loadedToken = tokenId ? tokens.find((item) => String(item?.tokenId) === String(tokenId)) : null;
  const ownerMatches = configuration?.configured === true
    && String(configuration.ownerId) === String(ownerId);
  let configured = ownerMatches && Boolean(loadedToken) && !loadedToken.revokedAt;

  if (!configured && !configuration?.configured && loadedToken && !loadedToken.revokedAt && savedBearer) {
    await configureMCP({
      url: getConfiguredMCPUrl() || serverResult?.mcpUrl,
      token: savedBearer,
      tokenId: loadedToken.tokenId,
    });
    configuration = await nativeModule.getConfiguration();
    configured = configuration?.configured === true
      && String(configuration.ownerId) === String(ownerId);
  }

  if (configuration?.configured && !configured) await clearMCPConfiguration();
  else if (configured && pendingBearer) await SecureStore.deleteItemAsync(PENDING_TOKEN_KEY);

  return {
    configured,
    token: configured ? loadedToken : null,
    tokens,
    mcpUrl: getConfiguredMCPUrl() || serverResult?.mcpUrl || null,
  };
};

export const revokeMCPToken = async (tokenId) => {
  const result = await callMeteorMethod("mcp.tokens.revoke", tokenId);
  const loadedTokenId = await SecureStore.getItemAsync(TOKEN_ID_KEY);
  if (String(loadedTokenId || "") === String(tokenId)) await clearMCPConfiguration();
  return result;
};

export const clearMCPConfiguration = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => null),
    SecureStore.deleteItemAsync(TOKEN_ID_KEY).catch(() => null),
    SecureStore.deleteItemAsync(PENDING_TOKEN_KEY).catch(() => null),
    SecureStore.deleteItemAsync(URL_KEY).catch(() => null),
    SecureStore.deleteItemAsync(TOOL_CACHE_KEY).catch(() => null),
  ]);
  if (VidkarMCP) await VidkarMCP.clearConfiguration().catch(() => null);
};

export const getMCPNaturalLanguageResult = async (id) => {
  const currentUserId = Meteor.userId();
  if (!currentUserId) throw new Error("Inicia sesión en VIDKAR para ver el resultado de Siri.");
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || id.length !== 36) {
    throw new Error("El identificador del resultado de Siri no es válido.");
  }
  const nativeModule = requireNativeMCP();
  const validateOwner = async () => {
    const configuration = await nativeModule.getConfiguration();
    if (Meteor.userId() !== currentUserId || !configuration?.configured || configuration.ownerId !== String(currentUserId)) {
      throw new Error("El resultado de Siri no pertenece a la sesión actual. Inicia sesión y vuelve a consultar a Siri.");
    }
  };
  await validateOwner();
  if (typeof nativeModule.getNaturalLanguageResult !== "function") {
    throw new Error("Este binario no admite resultados de Siri natural. Actualiza la aplicación.");
  }
  let raw;
  try {
    // Only reads the native, session-bound snapshot; never executes a tool or renews its TTL.
    raw = await nativeModule.getNaturalLanguageResult(id, String(currentUserId));
  } catch (error) {
    if (/auth|session|sesión|owner|permiso/i.test(`${error?.code || ""} ${error?.message || ""}`)) {
      throw new Error("La sesión del resultado de Siri ya no está autorizada. Inicia sesión y vuelve a consultar a Siri.");
    }
    throw new Error("El resultado de Siri venció o ya no está disponible. Se conserva durante 120 segundos; vuelve a consultar a Siri.");
  }
  await validateOwner();
  let envelope;
  try {
    envelope = JSON.parse(raw);
  } catch {
    throw new Error("El resultado de Siri no tiene un formato válido.");
  }
  if (!envelope || typeof envelope.query !== "string" || typeof envelope.tool !== "string" || !envelope.tool.trim()
    || typeof envelope.summary !== "string" || !Object.prototype.hasOwnProperty.call(envelope, "data")
    || typeof envelope.expiresAt !== "number" || !Number.isFinite(envelope.expiresAt)) {
    throw new Error("El resultado de Siri no tiene un formato válido.");
  }
  if (envelope.expiresAt <= Date.now()) {
    throw new Error("El resultado de Siri venció. Vuelve a consultar a Siri.");
  }
  return envelope;
};

export const authorizeMCPPlayback = async (entityType, entityId, querySession) => {
  const currentUserId = Meteor.userId();
  if (!currentUserId) throw new Error("Inicia sesión en VIDKAR antes de reproducir contenido.");
  if (!["movie", "episode", "lesson"].includes(String(entityType)) || !String(entityId)) {
    throw new Error("No tienes permisos para realizar esa acción en VIDKAR.");
  }
  const nativeModule = requireNativeMCP();
  const configuration = await nativeModule.getConfiguration();
  if (!configuration.configured || configuration.ownerId !== String(currentUserId)) {
    await clearMCPConfiguration();
    throw new Error("El token MCP no pertenece a la sesión actual de VIDKAR.");
  }
  const responseText = await executeMCPTool("search_entities", {
    entity: String(entityType),
    id: String(entityId),
    limit: 1,
    offset: 0,
    ...(String(entityType) === "lesson" ? { confirmed: true } : {}),
  }, querySession);
  const response = typeof responseText === "string" ? JSON.parse(responseText) : responseText;
  const matchingEntity = Array.isArray(response?.results)
    && response.results.some((entry) => String(entry.id) === String(entityId));
  if (response?.success !== true || !matchingEntity) {
    throw new Error(response?.error?.message || "No tienes permisos para reproducir este contenido en VIDKAR.");
  }
  return nativeModule.authorizePlayback(String(entityType), String(entityId));
};

export const consumeMCPPlaybackAuthorization = async (entityType, entityId) => {
  const currentUserId = Meteor.userId();
  if (!currentUserId) return false;
  const nativeModule = requireNativeMCP();
  const configuration = await nativeModule.getConfiguration();
  if (!configuration.configured || configuration.ownerId !== String(currentUserId)) {
    await clearMCPConfiguration();
    return false;
  }
  return nativeModule.consumePlaybackAuthorization(String(entityType), String(entityId));
};

export const discoverMCPTools = async ({ force = false } = {}) => {
  const currentUserId = Meteor.userId();
  const configuration = await requireNativeMCP().getConfiguration();
  if (!currentUserId || !configuration.configured) throw new Error("Configura el acceso MCP desde la sesión actual de VIDKAR.");
  if (configuration.ownerId !== String(currentUserId)) {
    await clearMCPConfiguration();
    throw new Error("El token MCP no pertenece a la sesión actual de VIDKAR; se eliminó del dispositivo.");
  }
  const cached = await readCache();
  if (!force && cached && Date.now() - cached.updatedAt < TOOL_CACHE_TTL_MS) return cached.tools;
  const tools = await requireNativeMCP().discoverTools(force);
  await SecureStore.setItemAsync(TOOL_CACHE_KEY, JSON.stringify({ updatedAt: Date.now(), tools }));
  return tools;
};

export const refreshMCPTools = () => discoverMCPTools({ force: true });

export const findMCPTool = async (name) => (await discoverMCPTools()).find((tool) => tool.name === name) || null;

export const validateMCPArguments = (tool, args = {}) => {
  const schema = tool?.inputSchema || {};
  const properties = schema.properties || {};
  const required = Array.isArray(schema.required) ? schema.required : [];
  for (const key of required) {
    if (!(key in args) || args[key] === null || args[key] === "") throw new Error(`Falta el parámetro MCP requerido: ${key}`);
  }
  for (const key of Object.keys(args)) {
    if (!(key in properties)) throw new Error(`Parámetro MCP no permitido: ${key}`);
  }
  return true;
};

export const getMCPQuerySession = async () => {
  const ownerId = Meteor.userId();
  if (!ownerId) throw new Error("Inicia sesión en VIDKAR para continuar.");
  const nativeModule = requireNativeMCP();
  const configuration = await nativeModule.getConfiguration();
  if (Meteor.userId() !== ownerId || !configuration?.configured || configuration.ownerId !== String(ownerId)) {
    throw new Error("La sesión MCP cambió. Vuelve a confirmar la consulta en tu cuenta actual.");
  }
  if (typeof configuration.revision !== "string" || !configuration.revision
    || typeof nativeModule.executeToolForSession !== "function") {
    throw new Error("Actualiza el binario de VIDKAR para usar la búsqueda segura desde Siri.");
  }
  return Object.freeze({ ownerId: String(ownerId), revision: configuration.revision });
};

export const assertMCPQuerySession = async (session) => {
  const current = await getMCPQuerySession();
  if (current.ownerId !== session?.ownerId || current.revision !== session?.revision) {
    throw new Error("La sesión MCP cambió. Vuelve a confirmar la consulta en tu cuenta actual.");
  }
};

export const executeMCPTool = async (toolName, args = {}, querySession = null) => {
  // Un booleano no permite reconstruir a posteriori la sesión consentida.
  if (args.confirmed === true && !querySession) {
    throw new Error("La sesión MCP cambió. Vuelve a confirmar la consulta en tu cuenta actual.");
  }
  const session = querySession || await getMCPQuerySession();
  await assertMCPQuerySession(session);
  const tool = await findMCPTool(toolName);
  if (!tool) throw new Error(`La herramienta MCP no está disponible: ${toolName}`);
  if (tool.readOnly !== true) throw new Error("No tienes permisos para realizar esa acción en VIDKAR.");
  validateMCPArguments(tool, args);
  await assertMCPQuerySession(session);
  const result = await requireNativeMCP().executeToolForSession(toolName, args, session.ownerId, session.revision);
  await assertMCPQuerySession(session);
  return result;
};

export const parseMCPArgumentsJSON = parseArgumentsJSON;

export const getMCPToolCatalog = async ({ force = false } = {}) => formatToolCatalog(await discoverMCPTools({ force }));

export const MCPToolRouter = {
  discover: discoverMCPTools,
  refreshTools: refreshMCPTools,
  findTool: findMCPTool,
  validateArguments: validateMCPArguments,
  execute: executeMCPTool,
};
