import * as SecureStore from "expo-secure-store";
import { VidkarMCP } from "../../modules/vidkar-mcp/src";
import { Meteor } from "../meteor/client.native";

const TOKEN_KEY = "vidkar.mcp.bearer.v1";
const URL_KEY = "vidkar.mcp.url.v1";
const TOOL_CACHE_KEY = "vidkar.mcp.tools.v1";
const TOOL_CACHE_TTL_MS = 5 * 60 * 1000;

const requireNativeMCP = () => {
  if (!VidkarMCP) throw new Error("El módulo nativo MCP no está disponible en este binario.");
  return VidkarMCP;
};

const isHttpsUrl = (value) => /^https:\/\//i.test(String(value || "").trim());

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

export const configureMCP = async ({ url, token }) => {
  if (!VidkarMCP) throw new Error("La integración MCP de VIDKAR requiere un binario iOS nativo.");
  if (!isHttpsUrl(url)) throw new Error("El endpoint MCP debe usar HTTPS.");
  if (String(token || "").length < 20) throw new Error("El token MCP no es válido.");
  const normalizedUrl = String(url).trim().replace(/\/$/, "");
  await requireNativeMCP().configure(normalizedUrl, String(token));
  await SecureStore.setItemAsync(TOKEN_KEY, String(token));
  await SecureStore.setItemAsync(URL_KEY, normalizedUrl);
  await SecureStore.deleteItemAsync(TOOL_CACHE_KEY);
};

export const createAndConfigureMCPToken = async (label = "VIDKAR iOS") => {
  if (!VidkarMCP) throw new Error("La integración MCP de VIDKAR requiere un binario iOS nativo.");
  const result = await new Promise((resolve, reject) => {
    Meteor.call("mcp.tokens.create", label, (error, value) => (error ? reject(error) : resolve(value)));
  });
  if (!result?.token || !isHttpsUrl(result?.mcpUrl)) {
    if (result?.tokenId) await revokeMCPToken(result.tokenId);
    throw new Error("El backend no devolvió un endpoint HTTPS y token MCP válidos.");
  }
  try {
    await configureMCP({ url: result.mcpUrl, token: result.token });
  } catch (error) {
    if (result?.tokenId) await revokeMCPToken(result.tokenId).catch(() => null);
    throw error;
  }
  return result;
};

export const revokeMCPToken = (tokenId) => new Promise((resolve, reject) => {
  Meteor.call("mcp.tokens.revoke", tokenId, (error, value) => (error ? reject(error) : resolve(value)));
});

export const clearMCPConfiguration = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => null),
    SecureStore.deleteItemAsync(URL_KEY).catch(() => null),
    SecureStore.deleteItemAsync(TOOL_CACHE_KEY).catch(() => null),
  ]);
  if (VidkarMCP) await VidkarMCP.clearConfiguration().catch(() => null);
};

export const discoverMCPTools = async ({ force = false } = {}) => {
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

export const executeMCPTool = async (toolName, args = {}) => {
  const tool = await findMCPTool(toolName);
  if (!tool) throw new Error(`La herramienta MCP no está disponible: ${toolName}`);
  validateMCPArguments(tool, args);
  return requireNativeMCP().executeTool(toolName, args);
};

export const MCPToolRouter = {
  discover: discoverMCPTools,
  refreshTools: refreshMCPTools,
  findTool: findMCPTool,
  validateArguments: validateMCPArguments,
  execute: executeMCPTool,
};
