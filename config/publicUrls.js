const DEFAULT_VIDKAR_BASE_URL = "https://www.vidkar.com";
const DEFAULT_HLS_SERVER_URL = "https://hls.vidkar.com";

const parseUrlParts = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const match = /^(https?|wss?):\/\/([^/?#]+)(\/[^?#]*)?$/i.exec(value.trim());
  if (!match || match[2].includes("@") || /\s/.test(match[2])) return null;
  return {
    authority: match[2],
    path: match[3] || "",
    protocol: `${match[1].toLowerCase()}:`,
  };
};

const normalizeHttpBaseUrl = (value) => {
  const parts = parseUrlParts(value);
  if (!parts || !["http:", "https:"].includes(parts.protocol)) return null;
  return `${parts.protocol}//${parts.authority}`;
};

const normalizeMeteorUrl = (value) => {
  const parts = parseUrlParts(value);
  if (!parts) return null;
  const protocol = parts.protocol === "https:"
    ? "wss:"
    : parts.protocol === "http:"
      ? "ws:"
      : parts.protocol;
  if (!["ws:", "wss:"].includes(protocol)) return null;
  const path = !parts.path || parts.path === "/" ? "/websocket" : parts.path;
  return `${protocol}//${parts.authority}${path}`;
};

const deriveMeteorUrl = (baseUrl) => {
  const base = parseUrlParts(baseUrl);
  if (!base) return null;
  const protocol = base.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${base.authority}/websocket`;
};

const normalizeMcpUrl = (value) => {
  const parts = parseUrlParts(value);
  if (!parts || parts.protocol !== "https:") return null;
  const path = !parts.path || parts.path === "/" ? "/mcp" : parts.path.replace(/\/$/, "");
  if (path !== "/mcp") return null;
  return `${parts.protocol}//${parts.authority}${path}`;
};

const resolvePublicUrls = (env = {}, extra = {}) => {
  const envBaseUrl = normalizeHttpBaseUrl(env.EXPO_PUBLIC_VIDKAR_BASE_URL);
  const manifestBaseUrl = normalizeHttpBaseUrl(extra.vidkarBaseUrl);
  const vidkarBaseUrl = envBaseUrl || manifestBaseUrl || DEFAULT_VIDKAR_BASE_URL;
  const baseWasConfigured = Boolean(envBaseUrl || manifestBaseUrl);

  const meteorUrl = normalizeMeteorUrl(env.EXPO_PUBLIC_METEOR_URL)
    || (!baseWasConfigured ? normalizeMeteorUrl(extra.meteorUrl) : null)
    || deriveMeteorUrl(vidkarBaseUrl);
  const mcpServerUrl = normalizeMcpUrl(env.EXPO_PUBLIC_MCP_URL)
    || (!baseWasConfigured ? normalizeMcpUrl(extra.mcpServerUrl) : null)
    || (vidkarBaseUrl.startsWith("https://") ? `${vidkarBaseUrl}/mcp` : null);
  const hlsServerUrl = normalizeHttpBaseUrl(env.EXPO_PUBLIC_HLS_SERVER_URL)
    || normalizeHttpBaseUrl(extra.hlsServerUrl)
    || DEFAULT_HLS_SERVER_URL;

  return { vidkarBaseUrl, meteorUrl, mcpServerUrl, hlsServerUrl };
};

const buildMeteorUrlForHost = (value, configuredUrl) => {
  const input = String(value || "").trim();
  if (!input) return normalizeMeteorUrl(configuredUrl);

  if (/^(?:https?|wss?):\/\//i.test(input)) {
    return normalizeMeteorUrl(input);
  }

  const current = normalizeMeteorUrl(configuredUrl);
  const currentParts = parseUrlParts(current);
  if (currentParts && input.toLowerCase() === currentParts.authority.toLowerCase()) return current;
  const hasPort = input.startsWith("[") ? /\]:\d+$/.test(input) : /:\d+$/.test(input);
  const authority = hasPort ? input : `${input}:3000`;
  return normalizeMeteorUrl(`ws://${authority}/websocket`);
};

const getMeteorHttpOrigin = (meteorUrl) => {
  const endpoint = normalizeMeteorUrl(meteorUrl);
  if (!endpoint) return null;
  const parts = parseUrlParts(endpoint);
  if (!parts) return null;
  return `${parts.protocol === "wss:" ? "https:" : "http:"}//${parts.authority}`;
};

const getMeteorHost = (meteorUrl) => parseUrlParts(normalizeMeteorUrl(meteorUrl))?.authority || null;

module.exports = {
  DEFAULT_HLS_SERVER_URL,
  DEFAULT_VIDKAR_BASE_URL,
  buildMeteorUrlForHost,
  getMeteorHttpOrigin,
  getMeteorHost,
  normalizeHttpBaseUrl,
  normalizeMcpUrl,
  normalizeMeteorUrl,
  resolvePublicUrls,
};
