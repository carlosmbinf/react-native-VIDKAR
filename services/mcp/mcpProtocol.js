export const parseArgumentsJSON = (argumentsJSON) => {
  let value;
  try {
    value = JSON.parse(argumentsJSON);
  } catch {
    throw new Error("Los argumentos MCP deben ser un JSON válido.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Los argumentos MCP deben ser un objeto JSON.");
  }
  return value;
};

export const buildToolCallRequest = (toolName, argumentsValue, id = 1) => {
  if (typeof toolName !== "string" || !toolName.trim()) {
    throw new Error("El nombre de la herramienta MCP es obligatorio.");
  }
  if (!argumentsValue || typeof argumentsValue !== "object" || Array.isArray(argumentsValue)) {
    throw new Error("Los argumentos MCP deben ser un objeto JSON.");
  }
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name: toolName, arguments: argumentsValue },
  };
};

export const extractToolResult = (message) => {
  if (message?.error) {
    const code = message.error.code ?? "MCP_JSONRPC_ERROR";
    throw new Error(`MCP JSON-RPC ${code}: ${message.error.message || "La solicitud MCP falló."}`);
  }
  const result = message?.result ?? message;
  if (result?.isError === true) {
    const text = Array.isArray(result.content)
      ? result.content.filter((item) => item?.type === "text").map((item) => item.text).join("\n")
      : "";
    throw new Error(text || "La herramienta MCP devolvió un error.");
  }
  if (Array.isArray(result?.content)) {
    const text = result.content.find((item) => item?.type === "text" && typeof item.text === "string")?.text;
    if (typeof text === "string") return text;
  }
  return JSON.stringify(result);
};

export const describeHTTPError = (status, body = "") => {
  const normalizedBody = typeof body === "string" ? body.trim() : "";
  return normalizedBody
    ? `MCP HTTP ${status}: ${normalizedBody}`
    : `MCP HTTP ${status}: verifica el token MCP y la conexión.`;
};

export const formatToolCatalog = (tools = []) => JSON.stringify(
  tools.map(({ name, description = "", inputSchema = {} }) => ({ name, description, inputSchema })),
  null,
  2,
);
