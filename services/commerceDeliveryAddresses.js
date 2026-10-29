export function normalizeDeliveryLocation(value) {
  if (!value || value.latitude == null || value.longitude == null) return null;
  if ([value.latitude, value.longitude].some((part) => typeof part === 'boolean' || String(part).trim() === '')) return null;
  const latitude = Number(value.latitude);
  const longitude = Number(value.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

export function initialDeliverySelection(items, addresses, fallback = null) {
  const previous = items.find((item) => item.type === 'COMERCIO' && normalizeDeliveryLocation(item.coordenadas));
  if (previous) {
    const point = normalizeDeliveryLocation(previous.coordenadas);
    const street = String(previous.nombreCalle || '').trim();
    const houseNumber = String(previous.numeroCasa || '').trim();
    const saved = addresses.find((entry) => entry.latitude === point.latitude && entry.longitude === point.longitude
      && entry.street === street && entry.houseNumber === houseNumber);
    return { point, street, houseNumber, addressId: saved?.id || '' };
  }
  const preferred = addresses.find((entry) => entry.isDefault && normalizeDeliveryLocation(entry));
  return preferred
    ? { point: normalizeDeliveryLocation(preferred), street: preferred.street, houseNumber: preferred.houseNumber, addressId: preferred.id }
    : { point: normalizeDeliveryLocation(fallback), street: '', houseNumber: '', addressId: '' };
}

export const commerceCartIds = (items) => JSON.stringify(items.filter((item) => item.type === 'COMERCIO').map((item) => String(item._id)).sort());

// Usa el snapshot confirmado mientras llega la actualización reactiva del carrito.
export function applyDeliverySnapshot(items, snapshot, userId) {
  if (!snapshot || snapshot.userId !== userId || snapshot.cartIds !== commerceCartIds(items)) return items;
  return items.map((item) => item.type === 'COMERCIO' ? {
    ...item, coordenadas: snapshot.point, nombreCalle: snapshot.street, numeroCasa: snapshot.houseNumber,
  } : item);
}

export function createDeliveryAddressClient({ call, getUserId, timeoutMs = 20000 }) {
  const stale = () => Object.assign(new Error('La sesión cambió. Abre nuevamente tu carrito.'), { code: 'delivery-address-session-changed' });
  const invoke = (userId, method, ...args) => new Promise((resolve, reject) => {
    if (!userId || getUserId() !== userId) { reject(stale()); return; }
    const timer = setTimeout(() => reject(new Error('No se pudo confirmar la operación. Revisa tu conexión e inténtalo de nuevo.')), timeoutMs);
    try {
      call(method, ...args, (error, result) => {
        clearTimeout(timer);
        if (getUserId() !== userId) { reject(stale()); return; }
        if (error) reject(error);
        else resolve(result);
      });
    } catch (error) { clearTimeout(timer); reject(error); }
  });
  const bookResult = (value) => {
    if (!Array.isArray(value?.addresses)) throw new Error('No se pudieron cargar tus direcciones.');
    return value;
  };
  const savedResult = (value) => {
    if (value?.success !== true || !value.address?.id || !normalizeDeliveryLocation(value.address) || !value.address.street) {
      throw new Error('No se pudo confirmar la dirección. Inténtalo de nuevo.');
    }
    return value;
  };
  return {
    list: async (userId) => bookResult(await invoke(userId, 'comercio.deliveryAddresses.list')),
    save: async (userId, address) => savedResult(await invoke(userId, 'comercio.deliveryAddresses.save', address)),
    use: async (userId, id) => {
      const result = savedResult(await invoke(userId, 'comercio.deliveryAddresses.use', id));
      if (!Number.isSafeInteger(result.itemsUpdated) || result.itemsUpdated < 1) throw new Error('No se pudo aplicar la dirección al carrito.');
      return result;
    },
    setDefault: async (userId, id) => bookResult(await invoke(userId, 'comercio.deliveryAddresses.setDefault', id)),
    remove: async (userId, id) => {
      const result = bookResult(await invoke(userId, 'comercio.deliveryAddresses.remove', id));
      if (result.success !== true) throw new Error('No se pudo eliminar la dirección.');
      return result;
    },
    applyNew: async (userId, address) => {
      const result = await invoke(userId, 'carrito.actualizarUbicacion', userId, {
        latitude: address.latitude, longitude: address.longitude, nombreCalle: address.street, numeroCasa: address.houseNumber,
      });
      if (result?.success !== true || !Number.isSafeInteger(result.itemsActualizados) || result.itemsActualizados < 1
          || !normalizeDeliveryLocation(result.coordenadas)) throw new Error('No se pudo aplicar la ubicación al carrito.');
      return { point: normalizeDeliveryLocation(result.coordenadas), street: result.nombreCalle, houseNumber: result.numeroCasa };
    },
  };
}
