export type UniversalLinkTarget = {
  pathname: string;
  params?: Record<string, string>;
};

export function canConsumeUniversalLink(
  pendingUrl: string | null,
  ready: boolean,
  userId: string | null,
): boolean {
  return Boolean(pendingUrl && ready && userId);
}

const SUPPORTED_HOSTS = new Set(["www.vidkar.com", "vidkar.com"]);
const SUPPORTED_ENTITY_LINKS = new Set([
  "search", "movie", "series", "episode", "course", "lesson", "user",
  "purchase", "sale", "order", "product", "message", "messages", "subscription",
]);
const NATURAL_RESULT_LINK = /^vidkar:\/\/search\?resultId=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function resolveUniversalLink(url: string): UniversalLinkTarget | null {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  const isVIDKARScheme = parsedUrl.protocol === "vidkar:";
  const isVIDKARWebLink = parsedUrl.protocol === "https:" &&
    SUPPORTED_HOSTS.has(parsedUrl.hostname.toLowerCase());
  if (!isVIDKARScheme && !isVIDKARWebLink) {
    return null;
  }

  let segments: string[];
  try {
    segments = parsedUrl.pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }
  const [pathSection, pathValue] = segments;
  const section = (isVIDKARScheme ? parsedUrl.hostname : pathSection || "").toLowerCase();
  const value = isVIDKARScheme ? pathSection : pathValue;

  if (isVIDKARScheme && !SUPPORTED_ENTITY_LINKS.has(section)) {
    return null;
  }

  if (parsedUrl.searchParams.has("resultId") && section !== "search") return null;

  if (section === "search") {
    if (parsedUrl.searchParams.has("resultId")) {
      // Validate the original URL too: URL parsing can normalize empty credentials/ports.
      const match = NATURAL_RESULT_LINK.exec(url);
      if (!isVIDKARScheme || parsedUrl.pathname !== "" || !match || match[0] !== url) return null;
      return { pathname: "/(normal)/SiriSearch", params: { resultId: match[1] } };
    }
    return {
      pathname: "/(normal)/SiriSearch",
      params: {
        query: parsedUrl.searchParams.get("q") || "",
        entityType: parsedUrl.searchParams.get("entity") || "all",
      },
    };
  }

  if (isVIDKARScheme) {
    if (!value && !["message", "messages"].includes(section)) return null;
    const shouldPlay = parsedUrl.searchParams.get("play") === "true";
    switch (section) {
      case "movie":
        return shouldPlay
          ? { pathname: "/(normal)/PeliculaPlayer", params: { id: value } }
          : parsedUrl.searchParams.get("q")
            ? { pathname: "/(normal)/SiriSearch", params: { query: parsedUrl.searchParams.get("q") || "", entityType: "movie", contentId: value } }
            : { pathname: "/(normal)/PeliculasVideos", params: { id: value } };
      case "series":
        return { pathname: "/(normal)/SeriesDetail", params: { id: value } };
      case "episode":
        return shouldPlay
          ? { pathname: "/(normal)/SeriesPlayer", params: { id: value } }
          : parsedUrl.searchParams.get("seriesId")
            ? { pathname: "/(normal)/SeriesDetail", params: { id: parsedUrl.searchParams.get("seriesId") || "" } }
            : { pathname: "/(normal)/SiriSearch", params: { query: parsedUrl.searchParams.get("q") || "", entityType: "episode", contentId: value } };
      case "course":
        return { pathname: "/(normal)/CursoDetalle", params: { courseId: value } };
      case "lesson": {
        const courseId = parsedUrl.searchParams.get("courseId");
        if (!courseId) return null;
        return {
          pathname: "/(normal)/CursoDetalle",
          params: shouldPlay ? { courseId, lessonId: value } : { courseId },
        };
      }
      case "user":
        return { pathname: "/(normal)/User", params: { item: value } };
      case "purchase":
        return { pathname: "/(normal)/MisCompras", params: { purchaseId: value } };
      case "sale":
        return { pathname: "/(normal)/VentasLegacy", params: { saleId: value } };
      case "order":
        return { pathname: "/(normal)/MisCompras", params: { orderId: value } };
      case "subscription":
        return { pathname: "/(normal)/MisCompras", params: { subscriptionId: value } };
      case "product":
        return {
          pathname: "/(normal)/SiriSearch",
          params: { query: parsedUrl.searchParams.get("q") || "", entityType: "product", productId: value },
        };
      case "message":
        return { pathname: "/(normal)/Mensajes", params: value ? { messageId: value } : undefined };
      case "messages":
        return { pathname: "/(normal)/Mensajes" };
      default:
        return null;
    }
  }

  if (!section) {
    return { pathname: "/(normal)/Main" };
  }

  switch (section) {
    case "peliculas":
      return { pathname: "/(normal)/PeliculasVideos" };
    case "pelicula":
      return value ? { pathname: "/(normal)/PeliculaPlayer", params: { id: value } } : { pathname: "/(normal)/PeliculasVideos" };
    case "cursos":
      return value
        ? {
            pathname: "/(normal)/CursoDetalle",
            params: { courseId: value },
          }
        : { pathname: "/(normal)/Cursos" };
    case "curso":
      return value ? { pathname: "/(normal)/CursoDetalle", params: { courseId: value } } : { pathname: "/(normal)/Cursos" };
    case "series":
      return value ? { pathname: "/(normal)/SeriesDetail", params: { id: value } } : { pathname: "/(normal)/Series" };
    case "capitulo":
    case "episode":
      return value ? { pathname: "/(normal)/SeriesPlayer", params: { id: value } } : null;
    case "mensajes":
      return { pathname: "/(normal)/Mensajes" };
    default:
      return null;
  }
}

export function getUniversalLinkKey(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const pathname =
      parsedUrl.pathname === "/" ? "/" : parsedUrl.pathname.replace(/\/+$/, "");
    return `${parsedUrl.protocol}//${parsedUrl.hostname.toLowerCase()}${pathname}${parsedUrl.search}`;
  } catch {
    return url;
  }
}
