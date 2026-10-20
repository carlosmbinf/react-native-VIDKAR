// Categorías de la interfaz VIDKAR, no StringSearchScope de Apple.
export const IN_APP_SEARCH_CATEGORIES = [
  { value: "all", label: "Catálogo" },
  { value: "movie", label: "Películas" },
  { value: "series", label: "Series" },
  { value: "course", label: "Cursos" },
  { value: "product", label: "Productos" },
  { value: "user", label: "Usuarios" },
];

// Compras, ventas, órdenes y similares se consultan por Siri/MCP, no en esta pantalla.
const SECTION_LABELS = { episode: "Episodios", lesson: "Lecciones" };
// "episode" solo llega desde el deep link de un resultado de catálogo.
const SEARCH_TYPES = new Set([...IN_APP_SEARCH_CATEGORIES.map(({ value }) => value), "episode"]);
const LISTABLE_TYPES = new Set(["course"]);

const ENTITY_PREFIXES = [
  ["user", /^(?:usuari[oa]s?|cuentas?|clientes?)$/],
  ["movie", /^(?:pel[ií]culas?|pelis?)$/],
  ["series", /^series?$/],
  ["course", /^cursos?$/],
  ["product", /^productos?$/],
];
const FILLER_WORDS = /^(?:b[uú]sca(?:me|r|le)?|encu[eé]ntra(?:me)?|encontrar|mu[eé]stra(?:me)?|mostrar|abre|abrir|dame|quiero|ver|en|vidkar|a|al|el|la|los|las|un|una|del|de)$/i;

// Siri entrega la frase completa ("búscame el usuario Carlos Medina"); se
// detecta solo un prefijo explícito de entidad para elegir el chip correcto.
export function inferInAppSearchIntent(query) {
  if (typeof query !== "string") return null;
  const words = query.trim().split(/\s+/).filter(Boolean);
  let index = 0;
  while (index < words.length && FILLER_WORDS.test(words[index])) index += 1;
  const candidate = (words[index] || "").toLowerCase().replace(/[:,.]$/, "");
  const match = ENTITY_PREFIXES.find(([, pattern]) => pattern.test(candidate));
  if (!match) return null;
  const rest = words.slice(index + 1);
  while (rest.length && /^(?:de|del|el|la|llamad[oa]|con|nombre)$/i.test(rest[0])) rest.shift();
  if (!rest.length) return null;
  return { entityType: match[0], query: rest.join(" ") };
}

export function groupInAppSearchResults(results) {
  return results.reduce((sections, result) => {
    const section = sections.find((entry) => entry.type === result.type);
    if (section) section.results.push(result);
    else sections.push({
      type: result.type,
      title: IN_APP_SEARCH_CATEGORIES.find(({ value }) => value === result.type)?.label
        || SECTION_LABELS[result.type] || "Resultados",
      results: [result],
    });
    return sections;
  }, []);
}

export function makeInAppSearchArguments({ query, entityType, contentId = "", offset = 0 }) {
  if (typeof query !== "string" || !SEARCH_TYPES.has(entityType)) throw new Error("La búsqueda recibida no es válida.");
  // Una película seleccionada se resuelve por identidad, sin depender de su
  // título actual ni de la página en la que apareció en el catálogo.
  if (entityType === "movie" && contentId) {
    if (typeof contentId !== "string" || contentId.length > 120 || !contentId.trim()
      || /[\u0000-\u001f\u007f]/.test(contentId)) throw new Error("El identificador de película no es válido.");
    return { entity: "movie", id: contentId, limit: 1, offset: 0 };
  }
  const term = query.trim();
  if (term.length > 120 || /[\u0000-\u001f\u007f]/.test(term)) {
    throw new Error("La búsqueda admite hasta 120 caracteres, sin caracteres de control.");
  }
  if (!term && !LISTABLE_TYPES.has(entityType)) {
    throw new Error("Escribe un término o elige «Ver todos los cursos».");
  }
  if (!Number.isInteger(offset) || offset < 0 || offset > (entityType === "all" ? 200 : 10000)) {
    throw new Error("Se alcanzó el límite de búsqueda. Elige una categoría o precisa el texto.");
  }
  return { entity: entityType, query: term, limit: 20, offset };
}