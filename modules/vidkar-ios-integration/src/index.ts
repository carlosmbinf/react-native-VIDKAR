import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

let nativeModule: {
  isSpotlightAvailable?: () => boolean;
  indexSpotlightItems?: (domainIdentifier: string, items: SpotlightItem[]) => Promise<SpotlightResult>;
  replaceSpotlightItems?: (domainIdentifier: string, items: SpotlightItem[]) => Promise<SpotlightResult>;
  clearSpotlightDomain?: (domainIdentifier: string) => Promise<SpotlightResult>;
} | null = null;

if (Platform.OS === "ios") {
  try {
    // El módulo local solo existe en un development/release build; Expo Go conserva el fallback.
    nativeModule = requireOptionalNativeModule("VidkarIOSIntegration");
  } catch {
    nativeModule = null;
  }
}

export type SpotlightItem = {
  id: string;
  title: string;
  description?: string;
  keywords?: string[];
  contentURL?: string;
  thumbnailURL?: string;
  domainIdentifier?: string;
};

export type SpotlightResult = {
  indexed?: number;
  cleared?: boolean;
  domainIdentifier: string;
};

export const SPOTLIGHT_DOMAIN = "vidkar-catalog";
export const SPOTLIGHT_DOMAINS = {
  courses: "vidkar-courses",
  movies: "vidkar-movies",
} as const;

const cleanString = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
};

const normalizeUrl = (value: unknown) => {
  const url = cleanString(value, 2048);
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    return ["http:", "https:", "vidkar:"].includes(parsed.protocol.toLowerCase()) ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
};

const normalizeItem = (item: SpotlightItem, domainIdentifier: string): SpotlightItem | null => {
  const id = cleanString(item?.id, 200);
  const title = cleanString(item?.title, 200);
  if (!id || !title) return null;

  return {
    id,
    title,
    description: cleanString(item.description, 500) || undefined,
    keywords: Array.isArray(item.keywords)
      ? item.keywords.map((keyword) => cleanString(keyword, 80)).filter(Boolean).slice(0, 30)
      : [],
    contentURL: normalizeUrl(item.contentURL),
    thumbnailURL: normalizeUrl(item.thumbnailURL),
    domainIdentifier,
  };
};

export const isNativeSpotlightAvailable = () => Boolean(
  Platform.OS === "ios" && nativeModule?.isSpotlightAvailable?.(),
);

export const replaceSpotlightItems = async (
  items: SpotlightItem[],
  domainIdentifier = SPOTLIGHT_DOMAIN,
) => {
  const normalizedItems = items.map((item) => normalizeItem(item, domainIdentifier)).filter(Boolean) as SpotlightItem[];
  if (!nativeModule?.replaceSpotlightItems) {
    return { indexed: 0, domainIdentifier };
  }

  return nativeModule.replaceSpotlightItems(domainIdentifier, normalizedItems);
};

export const indexSpotlightItems = async (
  items: SpotlightItem[],
  domainIdentifier = SPOTLIGHT_DOMAIN,
) => {
  const normalizedItems = items.map((item) => normalizeItem(item, domainIdentifier)).filter(Boolean) as SpotlightItem[];
  if (!nativeModule?.indexSpotlightItems) {
    return { indexed: 0, domainIdentifier };
  }

  return nativeModule.indexSpotlightItems(domainIdentifier, normalizedItems);
};

export const clearSpotlight = async (domainIdentifier = SPOTLIGHT_DOMAIN) => {
  if (!nativeModule?.clearSpotlightDomain) {
    return { cleared: false, domainIdentifier };
  }

  return nativeModule.clearSpotlightDomain(domainIdentifier);
};

export const buildCourseSpotlightItem = (course: any): SpotlightItem | null => {
  const id = cleanString(course?._id, 200);
  const title = cleanString(course?.titulo, 200);
  if (!id || !title) return null;

  return {
    id: `curso:${id}`,
    title,
    description: cleanString(course?.descripcion, 500),
    keywords: ["curso", "aprendizaje", cleanString(course?.categoria, 80), cleanString(course?.nivel, 80)].filter(Boolean),
    contentURL: `vidkar://curso/${encodeURIComponent(id)}`,
    thumbnailURL: normalizeUrl(course?.portada || course?.cover || course?.imagen),
  };
};

export const buildMovieSpotlightItem = (movie: any): SpotlightItem | null => {
  const id = cleanString(movie?._id, 200);
  const title = cleanString(movie?.nombrePeli, 200);
  if (!id || !title) return null;

  return {
    id: `pelicula:${id}`,
    title,
    description: cleanString(movie?.descripcion, 500),
    keywords: ["película", "peliculas", cleanString(movie?.year, 20), ...(Array.isArray(movie?.clasificacion) ? movie.clasificacion : [])]
      .filter(Boolean)
      .map((keyword) => cleanString(String(keyword), 80))
      .filter(Boolean),
    contentURL: `vidkar://pelicula/${encodeURIComponent(id)}`,
    thumbnailURL: normalizeUrl(movie?.urlBackgroundHTTPS || movie?.urlBackground),
  };
};
