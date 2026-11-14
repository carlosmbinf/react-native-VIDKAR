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
const getConfiguredWebHost = () => {
  const configuredBaseUrl = typeof process !== "undefined"
    ? process.env.EXPO_PUBLIC_VIDKAR_BASE_URL
    : undefined;
  if (typeof configuredBaseUrl !== "string" || !configuredBaseUrl.trim()) return null;
  try {
    const url = new URL(configuredBaseUrl.trim());
    return url.protocol === "https:" ? url.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
};
export function isSupportedWebHost(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  return SUPPORTED_HOSTS.has(normalizedHost) || normalizedHost === getConfiguredWebHost();
}

export function getPaymentReturnUrl(path: string, baseUrl: string): string | null {
  try {
    if (path.length > 4096 || /[\u0000-\u001f\u007f]/.test(path)) return null;
    const url = new URL(path, baseUrl);
    if (url.protocol !== "https:" || !isSupportedWebHost(url.hostname)
        || url.username || url.password || url.port || url.hash) return null;
    const paypal = url.pathname === "/capture-order" || url.pathname === "/cancel-order";
    const mercadoPago = ["/pago/success", "/pago/failure", "/pago/pending"].includes(url.pathname);
    if (!paypal && !mercadoPago) return null;
    if (paypal) {
      const tokens = url.searchParams.getAll("token");
      if (tokens.length !== 1 || !/^[A-Za-z0-9_-]{1,128}$/.test(tokens[0])) return null;
    }
    // El dominio sin www redirige actualmente a HTTP: usar el host HTTPS canónico.
    if (url.hostname === "vidkar.com") url.hostname = "www.vidkar.com";
    url.searchParams.delete("cerrarPestana");
    return url.toString();
  } catch {
    return null;
  }
}

const MAIN_ROUTE = "/(normal)/Main";
const FRONTEND_ROUTES: Record<string, string> = {
  "": MAIN_ROUTE,
  "admin/aprobaciones-efectivo": "/(normal)/ListaArchivos",
  "admin/centro-antifraude": "/(normal)/CentroAntifraude",
  "admin/comercio-provisioning": "/(normal)/CommerceProvisioning",
  "admin/crones": MAIN_ROUTE,
  "admin/excepciones": "/(normal)/Excepciones",
  dashboard: "/(normal)/Dashboard",
  "evaluaciones-ia": "/(normal)/EvaluacionesIA",
  "ganancias-cursos": "/(normal)/GananciasCursos",
  "saldos-pagos": "/(normal)/LiquidacionesAdmin",
  cursos: "/(normal)/Cursos",
  "cursos/gestion": "/(normal)/GestionCursos",
  "evidencias-pendientes": "/(normal)/EvidenciasPendientes",
  home: MAIN_ROUTE,
  hls: "/(normal)/HlsAdmin",
  cubacel: "/(normal)/ProductosCubacelCards",
  peliculas: "/(normal)/PeliculasVideos",
  series: "/(normal)/Series",
  comercio: "/(normal)/ComerciosList",
  empresa: "/(normal)/EmpresaWelcome",
  "comercio/compras": "/(normal)/Ventas",
  remesas: "/(normal)/remesas",
  proxy: "/(normal)/ProxyPackages",
  vpn: "/(normal)/VPNPackages",
  precios: "/(normal)/Precios",
  propertys: "/(normal)/PropertyList",
  logs: "/(normal)/Logs",
  "mapa-usuarios": "/(normal)/MapaUsuarios",
  mensajes: "/(normal)/Mensajes",
  mcp: "/(normal)/MCPSettings",
  "mcp/authorize": MAIN_ROUTE,
  "notificaciones-vpn": "/(normal)/NotificacionUsersConnectionVPN",
  "lista-compras": "/(normal)/Ventas",
  ventas: "/(normal)/Ventas",
  users: "/(normal)/Users",
};

function resolveFrontendRoute(
  segments: string[],
  searchParams: URLSearchParams,
): UniversalLinkTarget | null {
  const normalizedSegments = segments.map((segment) => segment.toLowerCase());
  const routeKey = normalizedSegments.join("/");
  const staticRoute = FRONTEND_ROUTES[routeKey];

  if (staticRoute) {
    if (staticRoute === "/(normal)/Ventas") {
      const params: Record<string, string> = {};
      const id = searchParams.get("id");
      const pago = searchParams.get("pago");
      if (id) params.id = id;
      if (pago === "PAGADO" || pago === "PENDIENTE") params.pago = pago;
      return { pathname: staticRoute, ...(Object.keys(params).length ? { params } : {}) };
    }

    if (staticRoute === "/(normal)/Mensajes") {
      const userId = searchParams.get("id");
      return {
        pathname: staticRoute,
        ...(userId ? { params: { item: userId } } : {}),
      };
    }

    return { pathname: staticRoute };
  }

  const [section, value, subsection] = normalizedSegments;
  const [, rawValue, rawSubsection] = segments;

  if (section === "peliculas" && value === "reproducir" && rawSubsection && segments.length === 3) {
    return { pathname: "/(normal)/PeliculaPlayer", params: { id: rawSubsection } };
  }
  if (section === "series" && value === "reproducir" && rawSubsection && segments.length === 3) {
    return { pathname: "/(normal)/SeriesPlayer", params: { id: rawSubsection } };
  }
  if (section === "series" && rawValue && segments.length === 2) {
    return { pathname: "/(normal)/SeriesDetail", params: { id: rawValue } };
  }
  if (section === "cursos" && rawValue && segments.length === 2) {
    return { pathname: "/(normal)/CursoDetalle", params: { courseId: rawValue } };
  }
  if (section === "mensajes" && rawValue && segments.length === 2) {
    return { pathname: "/(normal)/Mensajes", params: { item: rawValue } };
  }
  if (section === "users" && rawValue && value && subsection === "services" && segments.length === 3) {
    return { pathname: "/(normal)/UserServices", params: { item: rawValue } };
  }
  if (section === "users" && rawValue && value && subsection === "commerce-categories" && segments.length === 3) {
    return { pathname: "/(normal)/UserCommerceCategories", params: { item: rawValue } };
  }
  if (section === "users" && rawValue && segments.length === 2) {
    return { pathname: "/(normal)/User", params: { item: rawValue } };
  }

  return null;
}

const SUPPORTED_ENTITY_LINKS = new Set([
  "search", "movie", "series", "episode", "course", "lesson", "user",
  "purchase", "sale", "order", "product", "message", "messages", "subscription",
]);
const NATURAL_RESULT_LINK = /^vidkar:\/\/search\?resultId=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const SEARCH_ENTITY_TYPES = new Set([
  "all", "movie", "series", "episode", "course", "lesson", "user",
  "purchase", "sale", "order", "product", "message", "subscription",
]);

export function resolveUniversalLink(url: string): UniversalLinkTarget | null {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  const isVIDKARScheme = parsedUrl.protocol === "vidkar:";
  const isVIDKARWebLink = parsedUrl.protocol === "https:" &&
    isSupportedWebHost(parsedUrl.hostname);
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
  const schemeSegments = parsedUrl.hostname
    ? [parsedUrl.hostname, ...segments]
    : segments;
  const routeSegments = isVIDKARScheme ? schemeSegments : segments;
  const [pathSection, pathValue] = segments;
  const section = (isVIDKARScheme ? schemeSegments[0] : pathSection || "").toLowerCase();
  const value = isVIDKARScheme ? schemeSegments[1] : pathValue;

  if (parsedUrl.searchParams.has("resultId") && section !== "search") return null;

  if (section === "search") {
    if (parsedUrl.searchParams.has("resultId")) {
      // Validate the original URL too: URL parsing can normalize empty credentials/ports.
      const match = NATURAL_RESULT_LINK.exec(url);
      if (!isVIDKARScheme || parsedUrl.pathname !== "" || !match || match[0] !== url) return null;
      return { pathname: "/siri-search", params: { resultId: match[1] } };
    }
    // Ningún enlace concede consentimiento ni puede pasar tools, tokens o playback.
    if (parsedUrl.username || parsedUrl.password || parsedUrl.port || url.includes("#") ||
        (isVIDKARScheme ? !/^vidkar:\/\/search(?:\?|$)/i.test(url) : segments.length !== 1)) return null;
    const keys = [...parsedUrl.searchParams.keys()];
    if (keys.some((key) => !["q", "entity"].includes(key)) || new Set(keys).size !== keys.length) return null;
    const query = parsedUrl.searchParams.get("q") || "";
    const entityType = parsedUrl.searchParams.get("entity") || "all";
    if (query.length > 120 || /[\u0000-\u001f\u007f]/.test(query) || !SEARCH_ENTITY_TYPES.has(entityType)) return null;
    return {
      pathname: "/siri-search",
      params: { query, entityType },
    };
  }

  const frontendTarget = resolveFrontendRoute(routeSegments, parsedUrl.searchParams);
  if (frontendTarget) return frontendTarget;

  if (isVIDKARScheme && !SUPPORTED_ENTITY_LINKS.has(section)) {
    return null;
  }

  if (isVIDKARScheme) {
    if (!value && !["message", "messages"].includes(section)) return null;
    const shouldPlay = parsedUrl.searchParams.get("play") === "true";
    switch (section) {
      case "movie":
        return shouldPlay
          ? { pathname: "/(normal)/PeliculaPlayer", params: { id: value } }
          : parsedUrl.searchParams.get("q")
            ? { pathname: "/siri-search", params: { query: parsedUrl.searchParams.get("q") || "", entityType: "movie", contentId: value } }
            : { pathname: "/(normal)/PeliculasVideos", params: { id: value } };
      case "series":
        return { pathname: "/(normal)/SeriesDetail", params: { id: value } };
      case "episode":
        return shouldPlay
          ? { pathname: "/(normal)/SeriesPlayer", params: { id: value } }
          : parsedUrl.searchParams.get("seriesId")
            ? { pathname: "/(normal)/SeriesDetail", params: { id: parsedUrl.searchParams.get("seriesId") || "" } }
            : { pathname: "/siri-search", params: { query: parsedUrl.searchParams.get("q") || "", entityType: "episode", contentId: value } };
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
          pathname: "/siri-search",
          params: { query: parsedUrl.searchParams.get("q") || "", entityType: "product", productId: value },
        };
      case "message":
        return { pathname: "/(normal)/Mensajes", params: value ? { messageId: value } : undefined };
      case "messages":
        return { pathname: "/(normal)/Mensajes" };
      default:
        return isVIDKARWebLink ? { pathname: MAIN_ROUTE } : null;
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
      return isVIDKARWebLink ? { pathname: MAIN_ROUTE } : null;
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
