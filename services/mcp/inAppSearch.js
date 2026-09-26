// Categorías de la interfaz VIDKAR, no StringSearchScope de Apple.
export const IN_APP_SEARCH_CATEGORIES = [
  { value: "all", label: "Catálogo" },
  { value: "movie", label: "Películas" },
  { value: "series", label: "Series" },
  { value: "course", label: "Cursos" },
  { value: "product", label: "Productos" },
  { value: "user", label: "Usuarios" },
];

export const PRIVATE_SEARCH_TYPES = new Set(["user", "purchase", "sale", "order", "message", "subscription", "lesson"]);
const SEARCH_TYPES = new Set([...IN_APP_SEARCH_CATEGORIES.map(({ value }) => value), "episode", ...PRIVATE_SEARCH_TYPES]);
const LISTABLE_TYPES = new Set(["course", "purchase", "sale", "order", "message", "subscription"]);

export function makeInAppSearchArguments({ query, entityType, contentId = "", offset = 0, confirmed = false }) {
  if (typeof query !== "string" || !SEARCH_TYPES.has(entityType)) throw new Error("La búsqueda recibida no es válida.");
  // Una película seleccionada se resuelve por identidad, sin depender de su
  // título actual ni de la página en la que apareció en el catálogo.
  if (entityType === "movie" && contentId) {
    if (typeof contentId !== "string" || contentId.length > 120 || !contentId.trim()
      || /[\u0000-\u001f\u007f]/.test(contentId)) throw new Error("El identificador de película no es válido.");
    return { entity: "movie", id: contentId, limit: 1, offset: 0, confirmed: false };
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
  return { entity: entityType, query: term, limit: 20, offset, confirmed: PRIVATE_SEARCH_TYPES.has(entityType) && confirmed === true };
}