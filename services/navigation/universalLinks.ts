export type UniversalLinkTarget = {
  pathname: string;
  params?: Record<string, string>;
};

const SUPPORTED_HOSTS = new Set(["www.vidkar.com", "vidkar.com"]);

export function resolveUniversalLink(url: string): UniversalLinkTarget | null {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  if (
    parsedUrl.protocol !== "https:" ||
    !SUPPORTED_HOSTS.has(parsedUrl.hostname.toLowerCase())
  ) {
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
  const [section, value] = segments;

  if (!section) {
    return { pathname: "/(normal)/Main" };
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

  switch (section.toLowerCase()) {
    case "peliculas":
      return { pathname: "/(normal)/PeliculasVideos" };
    case "cursos":
      return value
        ? {
            pathname: "/(normal)/CursoDetalle",
            params: { courseId: value },
          }
        : { pathname: "/(normal)/Cursos" };
    case "mensajes":
      return { pathname: "/(normal)/Mensajes" };
    default:
      return null;
  }
}
