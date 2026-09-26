import { resolveUniversalLink } from "../services/navigation/universalLinks";

// Expo Router procesa búsquedas incluso cuando index.native no está montado.
// No sustituir los flujos históricos de otros enlaces/autenticación.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const url = new URL(path, "https://vidkar.com");
    const isSearch = url.protocol === "vidkar:" ? url.hostname.toLowerCase() === "search" : url.pathname === "/search";
    if (!isSearch) return path;
    const target = resolveUniversalLink(url.toString());
    // Validar también el original: el parser puede normalizar credenciales/puertos vacíos.
    if (!target || (path.includes("://") && !resolveUniversalLink(path))) return "/";
    return `${target.pathname}?${new URLSearchParams(target.params).toString()}`;
  } catch {
    return "/";
  }
}