export const HOME_SERVICE_DEFINITIONS = Object.freeze([
  {
    id: "COMERCIOS",
    label: "Comercios",
    description: "Tiendas, productos y pedidos de comercio.",
    icon: "storefront-outline",
    visibleByDefault: true,
  },
  {
    id: "CUBACEL",
    label: "Recargas Cubacel",
    description: "Recargas móviles y productos Cubacel.",
    icon: "cellphone-arrow-down",
    visibleByDefault: true,
  },
  {
    id: "PROXY_VPN",
    label: "Paquetes Proxy/VPN",
    description: "Planes disponibles de Proxy y VPN.",
    icon: "shield-check-outline",
    visibleByDefault: false,
  },
]);

const DEFINITIONS_BY_ID = new Map(HOME_SERVICE_DEFINITIONS.map((service) => [service.id, service]));

export const normalizeHomeServices = (services) => {
  const incoming = Array.isArray(services) ? services : [];
  const seen = new Set();
  const normalized = [];

  incoming.forEach((entry) => {
    const definition = DEFINITIONS_BY_ID.get(entry?.id);
    if (!definition || seen.has(definition.id)) return;
    seen.add(definition.id);
    normalized.push({
      ...definition,
      visible: typeof entry.visible === "boolean" ? entry.visible : definition.visibleByDefault,
    });
  });

  HOME_SERVICE_DEFINITIONS.forEach((definition) => {
    if (seen.has(definition.id)) return;
    normalized.push({ ...definition, visible: definition.visibleByDefault });
  });

  return normalized;
};

export const serializeHomeServices = (services) =>
  normalizeHomeServices(services).map(({ id, visible }) => ({ id, visible }));

export const getVisibleHomeServices = (services) =>
  normalizeHomeServices(services).filter((service) => service.visible);
