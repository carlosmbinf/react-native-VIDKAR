// Solo presentación para la transición; nunca sustituye al producto de Meteor.
const MAX_AGE_MS = 5000;
let pendingSnapshot = null;
let expiryTimer = null;

export function saveCubacelZoomSnapshot(productId, visual) {
  if (expiryTimer) clearTimeout(expiryTimer);
  pendingSnapshot = null;
  expiryTimer = null;

  if (typeof productId !== "string" || !productId) return;

  const snapshot = {
    productId,
    name: visual.name,
    priceLabel: visual.priceLabel,
    blur: visual.blur,
    imageSource: visual.imageSource,
    imageUrl: visual.imageUrl,
    createdAt: Date.now(),
  };
  pendingSnapshot = snapshot;
  expiryTimer = setTimeout(() => {
    if (pendingSnapshot === snapshot) {
      pendingSnapshot = null;
      expiryTimer = null;
    }
  }, MAX_AGE_MS);
}

export function getCubacelZoomSnapshot(productId) {
  if (!pendingSnapshot) return null;
  const age = Date.now() - pendingSnapshot.createdAt;
  if (age < 0 || age > MAX_AGE_MS) {
    return null;
  }
  if (pendingSnapshot.productId !== productId) return null;

  return pendingSnapshot;
}

export function clearCubacelZoomSnapshot(snapshot) {
  if (!snapshot || pendingSnapshot !== snapshot) return;
  clearTimeout(expiryTimer);
  pendingSnapshot = null;
  expiryTimer = null;
}