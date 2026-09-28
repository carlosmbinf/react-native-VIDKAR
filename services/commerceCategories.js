const normalizeId = (value) => (value == null ? "" : String(value));

export const UNCATEGORIZED_COMMERCE_CATEGORY_ID = "__commerce-uncategorized__";

export const isProductCategorySaveConfirmed = (result, expectedCategoryId) =>
  result?.success === true &&
  typeof result.idCategoria === "string" &&
  result.idCategoria === String(expectedCategoryId || "");

const normalizeSearchText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();

const compareCategoryNames = (left, right) =>
  String(left?.nombre || "").localeCompare(String(right?.nombre || ""), "es", {
    sensitivity: "base",
  });

export const buildCategoryTree = (categories) => {
  const byId = new Map();

  (Array.isArray(categories) ? categories : []).forEach((category) => {
    const id = normalizeId(category?._id);
    if (!id) return;

    byId.set(id, {
      ...category,
      _id: id,
      children: [],
    });
  });

  const roots = [];

  byId.forEach((category) => {
    const parentId = normalizeId(category.idCategoriaHeredada);

    if (!parentId) {
      roots.push(category);
      return;
    }

    const parent = byId.get(parentId);
    if (parent && parent._id !== category._id) {
      parent.children.push(category);
    }
  });

  const sortRecursively = (nodes) => {
    nodes.sort(compareCategoryNames);
    nodes.forEach((node) => sortRecursively(node.children));
  };

  sortRecursively(roots);

  return { byId, roots };
};

export const filterActiveCategoryTree = (nodes) =>
  (Array.isArray(nodes) ? nodes : [])
    .filter((category) => category?.activa !== false)
    .map((category) => ({
      ...category,
      children: filterActiveCategoryTree(category.children),
    }));

export const filterCategoryTree = (nodes, query) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return Array.isArray(nodes) ? nodes : [];

  return (Array.isArray(nodes) ? nodes : []).reduce((matches, category) => {
    const children = filterCategoryTree(category.children, normalizedQuery);
    const nameMatches = normalizeSearchText(category?.nombre).includes(normalizedQuery);

    if (nameMatches || children.length) {
      matches.push({ ...category, children });
    }

    return matches;
  }, []);
};

export const getCategoryPath = (tree, categoryId) => {
  const byId = tree?.byId instanceof Map ? tree.byId : new Map();
  const path = [];
  const visitedIds = new Set();
  let current = byId.get(normalizeId(categoryId));

  while (current && !visitedIds.has(current._id)) {
    visitedIds.add(current._id);
    path.unshift(current);
    current = byId.get(normalizeId(current.idCategoriaHeredada));
  }

  return path;
};

export const getSelectableCategoryIds = (nodes) => {
  const ids = new Set();
  const visit = (categories) => {
    (Array.isArray(categories) ? categories : []).forEach((category) => {
      ids.add(normalizeId(category?._id));
      visit(category?.children);
    });
  };

  visit(nodes);
  ids.delete("");
  return ids;
};

export const normalizeCommerceHomeCategories = (categories, preferences) => {
  const tree = buildCategoryTree(categories);
  const available = new Map();
  const visit = (nodes, parents = [], parentVisible = true) => nodes.forEach((category) => {
    const visible = parentVisible && category.visibleEnInicio !== false;
    available.set(category._id, {
      id: category._id,
      label: [...parents, category.nombre].join(" › "),
      nombre: category.nombre,
      visible,
      ordenInicio: category.ordenInicio,
    });
    visit(category.children, [...parents, category.nombre], visible);
  });
  visit(filterActiveCategoryTree(tree.roots));
  const sorted = [...available.values()].sort((left, right) =>
    (Number.isInteger(left.ordenInicio) ? left.ordenInicio : Infinity) -
      (Number.isInteger(right.ordenInicio) ? right.ordenInicio : Infinity) ||
    left.label.localeCompare(right.label, "es"));
  available.clear();
  sorted.forEach((category) => available.set(category.id, category));
  const result = [];
  (Array.isArray(preferences) ? preferences : []).forEach((entry) => {
    const category = available.get(entry?.id);
    if (!category) return;
    result.push(category);
    available.delete(entry.id);
  });
  return [...result, ...available.values()];
};

export const getGlobalCommerceHomeCategories = (categories) =>
  normalizeCommerceHomeCategories(categories, null);

export const filterVisibleCommerceStores = (stores, categories) => {
  const visibleIds = new Set(getGlobalCommerceHomeCategories(categories)
    .filter((category) => category.visible).map((category) => category.id));
  return (stores || []).map((tienda) => {
    const productos = (tienda.productos || []).filter((producto) => {
      const id = normalizeId(producto?.idCategoria).trim();
      return !id || visibleIds.has(id);
    });
    return {
      ...tienda,
      productos,
      productosDisponibles: productos.filter((producto) =>
        producto.productoDeElaboracion || Number(producto.count || 0) > 0).length,
      totalProductos: productos.length,
    };
  }).filter((tienda) => tienda.totalProductos > 0);
};

export const getCategoryDescendantIds = (categories, categoryId) => {
  const tree = buildCategoryTree(categories);
  const find = (nodes) => {
    for (const category of nodes) {
      if (category._id === categoryId) return getSelectableCategoryIds([category]);
      const nested = find(category.children);
      if (nested) return nested;
    }
    return null;
  };
  return find(filterActiveCategoryTree(tree.roots)) || new Set();
};

export const matchesCommerceProductCategory = (producto, categoryId) => {
  const assignedId = String(producto?.idCategoria || "").trim();
  return categoryId === UNCATEGORIZED_COMMERCE_CATEGORY_ID
    ? !assignedId
    : Boolean(categoryId) && assignedId === String(categoryId);
};

export const getPopulatedCommerceCategoryRows = (_categories, visibleCategories, stores) => {
  const products = (stores || []).flatMap((tienda) => (tienda.productos || [])
    .map((producto) => ({ producto, tienda })));
  const rows = visibleCategories.map((category) => ({
    ...category,
    matches: products.filter(({ producto }) => matchesCommerceProductCategory(producto, category.id)),
  })).filter((category) => category.matches.length > 0);
  const uncategorized = products.filter(({ producto }) => matchesCommerceProductCategory(producto, UNCATEGORIZED_COMMERCE_CATEGORY_ID));
  return uncategorized.length
    ? [...rows, { id: UNCATEGORIZED_COMMERCE_CATEGORY_ID, label: "Sin categoría", matches: uncategorized }]
    : rows;
};