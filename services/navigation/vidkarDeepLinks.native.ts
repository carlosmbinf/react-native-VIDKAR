import { Linking } from "react-native";

export type VidkarDeepLinkTarget = {
  pathname: "/(normal)/Cursos" | "/(normal)/CursoDetalle" | "/(normal)/PeliculasVideos" | "/(normal)/PeliculaPlayer" | "/(normal)/Main";
  params?: Record<string, string>;
};

const decodePart = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getPathSegments = (url: string) => {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname.split("/").filter(Boolean);
    const isVidkarScheme = parsed.protocol.toLowerCase() === "vidkar:";
    const segments = isVidkarScheme && hostname ? [hostname, ...path] : path;
    return segments.map(decodePart);
  } catch {
    return [];
  }
};

export const parseVidkarDeepLink = (url: string | null | undefined): VidkarDeepLinkTarget | null => {
  if (!url) return null;

  const segments = getPathSegments(url);
  const action = segments[0]?.toLowerCase();
  const identifier = segments[1];

  if (["cursos", "curso-catalogo"].includes(action) && identifier) {
    return {
      pathname: "/(normal)/CursoDetalle",
      params: { courseId: identifier },
    };
  }

  if (["cursos", "curso-catalogo"].includes(action)) {
    return { pathname: "/(normal)/Cursos" };
  }

  if (action === "curso" && identifier) {
    return {
      pathname: "/(normal)/CursoDetalle",
      params: { courseId: identifier },
    };
  }

  if (action === "peliculas" && identifier === "reproducir" && segments[2]) {
    return {
      pathname: "/(normal)/PeliculaPlayer",
      params: { id: segments[2] },
    };
  }

  if (["peliculas", "peliculas-videos", "pelicula-catalogo"].includes(action)) {
    return { pathname: "/(normal)/PeliculasVideos" };
  }

  if (action === "pelicula" && identifier) {
    return {
      pathname: "/(normal)/PeliculaPlayer",
      params: { id: identifier },
    };
  }

  if (action === "continuar") {
    return { pathname: "/(normal)/Main" };
  }

  return null;
};

export const subscribeToVidkarDeepLinks = (
  onUrl: (url: string) => void,
) => {
  const subscription = Linking.addEventListener("url", ({ url }) => onUrl(url));
  let active = true;

  Linking.getInitialURL()
    .then((url) => {
      if (active && url) onUrl(url);
    })
    .catch(() => undefined);

  return () => {
    active = false;
    subscription.remove();
  };
};
