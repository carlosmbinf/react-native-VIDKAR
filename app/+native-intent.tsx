import { isSupportedWebHost, resolveUniversalLink } from "../services/navigation/universalLinks";
import { getVidkarBaseUrl } from "../services/appUrls";

// Expo Router procesa búsquedas incluso cuando index.native no está montado.
// No sustituir los flujos históricos de otros enlaces/autenticación.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (/^\/(?:\(normal\)|\(auth\)|siri-search)(?:\/|\?|$)/.test(path)) return path;

    const url = new URL(path, getVidkarBaseUrl());
    const isVIDKARLink = url.protocol === "vidkar:";
    const isVIDKARWebLink = url.protocol === "https:" && isSupportedWebHost(url.hostname);
    const isSearch = url.protocol === "vidkar:"
      ? url.hostname.toLowerCase() === "search"
      : isVIDKARWebLink && url.pathname === "/search";
    if (!isSearch && !isVIDKARLink && !isVIDKARWebLink) return path;
    if (isVIDKARLink && url.searchParams.get("play") === "true") return path;

    const target = resolveUniversalLink(url.toString());
    // Validar también el original: el parser puede normalizar credenciales/puertos vacíos.
    if (!target || (path.includes("://") && !resolveUniversalLink(path))) {
      return isSearch ? "/" : isVIDKARWebLink ? "/(normal)/Main" : path;
    }
    const query = new URLSearchParams(target.params).toString();
    return query ? `${target.pathname}?${query}` : target.pathname;
  } catch {
    return "/";
  }
}