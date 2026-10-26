import { UNCATEGORIZED_COMMERCE_CATEGORY_ID } from "./commerceCategories.js";

export const COMMERCE_CATALOG_INITIAL_LIMIT = 8;
export const COMMERCE_CATALOG_LIMIT_STEP = 8;
export const COMMERCE_CATALOG_MAX_LIMIT = 120;
export const COMMERCE_CATEGORY_SELECTION_LIMIT = 15;

const COMMERCE_CURRENCIES = new Set(["CUP", "UYU", "USD"]);

const normalizeId = (value) => (value == null ? "" : String(value).trim());

export const getCommerceCategorySelectionProducts = (products = [], productIds = []) => {
  const byId = new Map((Array.isArray(products) ? products : [])
    .map((product) => [String(product?._id), product]));
  return [...new Set(Array.isArray(productIds) ? productIds : [])]
    .slice(0, COMMERCE_CATEGORY_SELECTION_LIMIT)
    .map((id) => byId.get(String(id)))
    .filter(Boolean);
};

const parsePrice = (value) => {
  if (value == null || String(value).trim() === "") return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : NaN;
};

export const isValidCommercePriceRange = (minPrice, maxPrice) => {
  const min = parsePrice(minPrice);
  const max = parsePrice(maxPrice);
  return !Number.isNaN(min) && !Number.isNaN(max) &&
    (min == null || max == null || min <= max);
};

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const resolveCommerceProductSort = (sort = "recommended") => {
  if (sort === "price-asc") return { precio: 1, name: 1 };
  if (sort === "price-desc") return { precio: -1, name: 1 };
  if (sort === "name") return { name: 1 };
  return { createdAt: -1, name: 1 };
};

export const buildCommerceProductQuery = ({
  availability = "all",
  categoryIds = [],
  enabled = true,
  limit = COMMERCE_CATALOG_INITIAL_LIMIT,
  matchingStoreIds = [],
  maxPrice = "",
  minPrice = "",
  search = "",
  selectedCategory = "all",
  selectedCurrency = "all",
  selectedStore = "all",
  sort = "recommended",
  storeIds = [],
  visibleCategoryIds = [],
} = {}) => {
  const allowedStoreIds = [...new Set((Array.isArray(storeIds) ? storeIds : [])
    .map(normalizeId).filter(Boolean))];
  const safeLimit = Math.min(
    COMMERCE_CATALOG_MAX_LIMIT,
    Math.max(1, Number.isFinite(Number(limit))
      ? Math.floor(Number(limit))
      : COMMERCE_CATALOG_INITIAL_LIMIT),
  );
  const options = {
    limit: safeLimit + 1,
    sort: resolveCommerceProductSort(sort),
  };
  const normalizedStore = normalizeId(selectedStore);
  const normalizedCurrency = normalizeId(selectedCurrency).toUpperCase();
  const normalizedCategory = normalizeId(selectedCategory);
  const validStore = normalizedStore === "all" || allowedStoreIds.includes(normalizedStore);
  const validCurrency = normalizedCurrency === "ALL" || COMMERCE_CURRENCIES.has(normalizedCurrency);

  if (!enabled || !allowedStoreIds.length || !validStore || !validCurrency ||
    !isValidCommercePriceRange(minPrice, maxPrice)) {
    return {
      enabled: false,
      limit: safeLimit,
      options,
      selector: { _id: "__commerce-catalog-disabled__" },
    };
  }

  const selector = {
    idTienda: normalizedStore === "all"
      ? { $in: allowedStoreIds }
      : normalizedStore,
  };
  const andConditions = [];
  const visibleIds = [...new Set((Array.isArray(visibleCategoryIds) ? visibleCategoryIds : [])
    .map(normalizeId).filter(Boolean))];

  if (normalizedCategory === UNCATEGORIZED_COMMERCE_CATEGORY_ID) {
    andConditions.push({
      $or: [
        { idCategoria: { $exists: false } },
        { idCategoria: null },
        { idCategoria: "" },
        { idCategoria: /^\s*$/ },
      ],
    });
  } else if (normalizedCategory && normalizedCategory !== "all") {
    const requestedCategoryIds = [...new Set((Array.isArray(categoryIds) ? categoryIds : [])
      .map(normalizeId).filter(Boolean))];
    const selectedIds = visibleIds.length
      ? requestedCategoryIds.filter((id) => visibleIds.includes(id))
      : requestedCategoryIds;
    if (!selectedIds.length) {
      return {
        enabled: false,
        limit: safeLimit,
        options,
        selector: { _id: "__commerce-catalog-disabled__" },
      };
    }
    andConditions.push({
      idCategoria: selectedIds.length === 1 ? selectedIds[0] : { $in: selectedIds },
    });
  } else {
    const visibleCategoryConditions = visibleIds.length
      ? [{ idCategoria: { $in: visibleIds } }]
      : [];
    andConditions.push({
      $or: [
        ...visibleCategoryConditions,
        { idCategoria: null },
        { idCategoria: "" },
        { idCategoria: /^\s*$/ },
      ],
    });
  }

  if (availability === "made") {
    selector.productoDeElaboracion = true;
  } else if (availability === "available") {
    andConditions.push({
      $or: [{ productoDeElaboracion: true }, { count: { $gt: 0 } }],
    });
  }

  if (normalizedCurrency !== "ALL") {
    selector.monedaPrecio = normalizedCurrency;
  }

  const min = parsePrice(minPrice);
  const max = parsePrice(maxPrice);
  if (min != null || max != null) {
    selector.precio = {};
    if (min != null) selector.precio.$gte = min;
    if (max != null) selector.precio.$lte = max;
  }

  const trimmedSearch = String(search || "").trim().slice(0, 100);
  if (trimmedSearch) {
    const pattern = escapeRegex(trimmedSearch);
    const allowedMatchingStoreIds = [...new Set((Array.isArray(matchingStoreIds) ? matchingStoreIds : [])
      .map(normalizeId).filter((id) => allowedStoreIds.includes(id)))];
    const searchConditions = [
      { name: { $regex: pattern, $options: "i" } },
      { descripcion: { $regex: pattern, $options: "i" } },
    ];
    if (allowedMatchingStoreIds.length) {
      searchConditions.push({ idTienda: { $in: allowedMatchingStoreIds } });
    }
    andConditions.push({ $or: searchConditions });
  }

  if (andConditions.length) selector.$and = andConditions;

  return {
    enabled: true,
    limit: safeLimit,
    options,
    selector,
  };
};
